import type { ProductWorkspace, ReviewAction } from "./types.ts";
export const reviewActions: ReviewAction[] = ["reply", "skip", "human_review", "report"];
export function calculateBacktest(workspace: ProductWorkspace) {
  const ids = workspace.snapshot?.reviews.map(review => review.id) ?? [];
  const labelled = ids.filter(id => workspace.labels[id]);
  const evaluated = labelled.filter(id => workspace.assessments[id]);
  const matrix = reviewActions.map(() => reviewActions.map(() => 0));
  for (const id of evaluated) {
    const expected = reviewActions.indexOf(workspace.labels[id]);
    const actual = reviewActions.indexOf(workspace.assessments[id].action);
    if (expected < 0 || actual < 0) throw new Error("Nieprawidłowa akcja w danych backtestu.");
    matrix[expected][actual]++;
  }
  const correct = matrix.reduce((sum, row, i) => sum + row[i], 0);
  return {
    evaluated: evaluated.length, labelled: labelled.length, missingAssessments: labelled.length - evaluated.length,
    accuracy: evaluated.length ? correct / evaluated.length : null, actions: reviewActions, matrix,
    perAction: reviewActions.map((action, index) => {
      const support = matrix[index].reduce((sum, value) => sum + value, 0);
      const predicted = matrix.reduce((sum, row) => sum + row[index], 0);
      return { action, precision: predicted ? matrix[index][index] / predicted : null, recall: support ? matrix[index][index] / support : null, support };
    }),
  };
}
