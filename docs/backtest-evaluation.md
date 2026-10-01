# Offline backtest evaluation

`tools/evaluate-backtest.mjs` compares a frozen ReviewGuard workspace export with reference labels assigned independently in the blind-labeling page. It runs with Node.js 22 and uses only built-in modules; it does not call Google, a model provider, or the application server.

## Prepare inputs

Export the workspace JSON from ReviewGuard. Keep this file unchanged: its reviews and assessments are the predictions being evaluated. Start the local blind-labeling server with `node tools/blind-review-labeler/server.mjs`, open the localhost address it prints, load the export, label the reviews, and export the reference labels JSON. The label file includes the source dataset hash and a fingerprint for each labeled review. The evaluator rejects labels from a different or changed source, duplicate labels, unknown review IDs, unsupported actions, and unsupported split names.

Run:

```sh
node tools/evaluate-backtest.mjs reviewguard-backtest.json reviewguard-reference-labels.json > evaluation-report.json
```

Use `node tools/evaluate-backtest.mjs --help` for the command summary. Inputs and output are JSON. The command exits nonzero with an explanation when an input is malformed or does not match the source.

## Read the report

The report has separate `development` and `held_out` sections. Each reports the number of reference-labeled reviews, the number with an assessment, and the number missing an assessment. Its confusion matrix uses reference actions as rows and predicted actions as columns, in this order: `reply`, `skip`, `human_review`, `report`. Per-action precision, recall, and support follow that same order. Accuracy, precision, and recall are `null` when their denominator is zero; an empty split does not claim accuracy.

Model and policy-version counts are included both for all frozen assessments and for the assessments evaluated in each split. The report adds warnings when the frozen assessments mix model or policy versions. `source.datasetHash` identifies the normalized review set used by the labels. `source.exportSha256` identifies the canonical JSON content of the full frozen export, including its assessment results.

A held-out split is a descriptive evaluation set. The report warns that metrics describe only the labeled sample; sample size and representativeness require human judgment. The tool does not set an acceptance threshold. Review labels remain human reference judgments and should be interpreted with their coverage and reasons in mind.
