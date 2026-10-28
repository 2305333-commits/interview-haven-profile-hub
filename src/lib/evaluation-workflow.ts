/** Begin independent checks together; never delay answer grading behind video analysis. */
export function evaluateTogether<T, U>(answer: () => Promise<T>, media: () => Promise<U>) {
  return Promise.all([answer(), media()]);
}