#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonical, prepareSource } from "./blind-review-labeler/source-contract.mjs";

const ACTIONS = ["reply", "skip", "human_review", "report"];
const SPLITS = ["development", "held_out"];

function usage() {
  return `Usage: node tools/evaluate-backtest.mjs <frozen-export.json> <blind-reference.json>\n\nCompare frozen workspace assessments with independently assigned reference labels.\nWrites a reproducible JSON report to stdout.\n\nReference format: { version: 1, datasetHash, labels: [{ reviewId, fingerprint, action, split, reason? }] }`;
}

function fail(message) { throw new Error(message); }
function digest(value) { return createHash("sha256").update(value, "utf8").digest("hex"); }

async function normalizeSource(exported) {
  const snapshot = exported?.workspace?.snapshot;
  if (!snapshot || !Array.isArray(snapshot.reviews)) fail("Frozen export must contain workspace.snapshot.reviews.");
  const prepared = await prepareSource(exported);
  return { reviews: prepared.reviews, datasetHash: prepared.datasetHash };
}

async function validate(exported, reference) {
  if (!exported || typeof exported !== "object" || exported.version !== 1 || !exported.workspace || typeof exported.workspace !== "object") fail("Frozen export must have version 1 and a workspace object.");
  if (!reference || typeof reference !== "object" || reference.version !== 1 || !Array.isArray(reference.labels) || typeof reference.datasetHash !== "string") fail("Reference labels must have version 1, datasetHash, and a labels array.");
  const { reviews, datasetHash } = await normalizeSource(exported);
  if (reference.datasetHash !== datasetHash) fail("Reference datasetHash does not match the frozen source export.");
  const byId = new Map(reviews.map(review => [review.id, review]));
  const labels = new Map();
  for (const [index, label] of reference.labels.entries()) {
    if (!label || typeof label !== "object" || typeof label.reviewId !== "string") fail(`Label ${index + 1} must contain a string reviewId.`);
    if (labels.has(label.reviewId)) fail(`Duplicate reference label for review ${label.reviewId}.`);
    if (!ACTIONS.includes(label.action)) fail(`Label ${label.reviewId} has an unknown action.`);
    if (!SPLITS.includes(label.split)) fail(`Label ${label.reviewId} has an unknown split.`);
    const review = byId.get(label.reviewId);
    if (!review) fail(`Reference label points to unknown review ${label.reviewId}.`);
    if (label.fingerprint !== review.sourceFingerprint) fail(`Reference label for ${label.reviewId} has a stale source fingerprint.`);
    labels.set(label.reviewId, label);
  }
  const assessments = exported.workspace.assessments;
  if (!assessments || typeof assessments !== "object" || Array.isArray(assessments)) fail("Frozen export must contain a workspace.assessments object.");
  const checkedAssessments = new Map();
  for (const [key, assessment] of Object.entries(assessments)) {
    if (!assessment || typeof assessment !== "object" || Array.isArray(assessment)) fail(`Assessment ${key} must be an object.`);
    if (assessment.reviewId !== key) fail(`Assessment key ${key} does not match its reviewId.`);
    if (!byId.has(key)) fail(`Assessment points to unknown source review ${key}.`);
    if (!ACTIONS.includes(assessment.action)) fail(`Assessment ${key} has an unknown action.`);
    if (typeof assessment.model !== "string" || typeof assessment.policyVersion !== "string") fail(`Assessment ${key} must record model and policyVersion.`);
    checkedAssessments.set(key, assessment);
  }
  return { exported, reviews, labels, assessments: checkedAssessments, datasetHash };
}

function metrics(split, context) {
  const selected = [...context.labels.entries()].filter(([, label]) => label.split === split);
  const matrix = ACTIONS.map(() => ACTIONS.map(() => 0));
  const evaluatedLabels = [];
  let missingAssessments = 0;
  for (const [id, label] of selected) {
    const assessment = context.assessments.get(id);
    if (!assessment) { missingAssessments += 1; continue; }
    matrix[ACTIONS.indexOf(label.action)][ACTIONS.indexOf(assessment.action)] += 1;
    evaluatedLabels.push({ label, assessment });
  }
  const evaluated = evaluatedLabels.length;
  const correct = matrix.reduce((sum, row, index) => sum + row[index], 0);
  const perAction = ACTIONS.map((action, index) => {
    const support = matrix[index].reduce((sum, value) => sum + value, 0);
    const predicted = matrix.reduce((sum, row) => sum + row[index], 0);
    return { action, precision: predicted ? matrix[index][index] / predicted : null, recall: support ? matrix[index][index] / support : null, support };
  });
  return {
    split,
    labelled: selected.length,
    evaluated,
    missingAssessments,
    accuracy: evaluated ? correct / evaluated : null,
    actions: [...ACTIONS],
    confusionMatrix: { referenceRows_predictionColumns: matrix },
    perAction,
    modelCounts: counts(evaluatedLabels.map(item => item.assessment.model)),
    policyVersionCounts: counts(evaluatedLabels.map(item => item.assessment.policyVersion)),
  };
}
function counts(values) {
  const result = Object.create(null);
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

async function main(args) {
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) { process.stdout.write(`${usage()}\n`); return; }
  if (args.length !== 2) fail(usage());
  const [exportPath, referencePath] = args.map(argument => resolve(argument));
  let exported, reference;
  try { exported = JSON.parse(await readFile(exportPath, "utf8")); } catch (error) { fail(`Could not read frozen export JSON: ${error.message}`); }
  try { reference = JSON.parse(await readFile(referencePath, "utf8")); } catch (error) { fail(`Could not read reference JSON: ${error.message}`); }
  const context = await validate(exported, reference);
  const modelCounts = counts([...context.assessments.values()].map(item => item.model));
  const policyVersionCounts = counts([...context.assessments.values()].map(item => item.policyVersion));
  const evaluationWarnings = ["Metrics describe only the human-labeled sample; small or nonrepresentative samples do not establish model accuracy."];
  if (Object.keys(modelCounts).length > 1) evaluationWarnings.push("The frozen assessments contain multiple models; aggregate metrics mix model versions.");
  if (Object.keys(policyVersionCounts).length > 1) evaluationWarnings.push("The frozen assessments contain multiple policy versions; aggregate metrics mix policy versions.");
  const report = {
    version: 1,
    source: { datasetHash: context.datasetHash, exportSha256: digest(canonical(exported)) },
    assessmentMetadata: { modelCounts, policyVersionCounts },
    evaluationWarnings,
    splits: Object.fromEntries(SPLITS.map(split => [split, metrics(split, context)])),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main(process.argv.slice(2)).catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
