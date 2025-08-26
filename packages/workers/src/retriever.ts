export default async function retr(job: { query: number[]; topK: number }): Promise<{ ids: string[]; scores: number[] }> {
  const ids: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < job.topK; i++) { ids.push(`doc-${i}`); scores.push(1 - i / job.topK); }
  return { ids, scores };
}
module.exports = retr;
