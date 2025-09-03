export default async function vector(job: { op: 'upsert'|'query'; vectors?: number[][]; topK?: number }) {
  if (job.op === 'upsert') return { upserted: job.vectors?.length ?? 0 };
  if (job.op === 'query') return { ids: ['doc-0'], scores: [0.99] };
}
