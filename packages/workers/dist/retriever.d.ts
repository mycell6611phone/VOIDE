export default function retr(job: {
    query: number[];
    topK: number;
}): Promise<{
    ids: string[];
    scores: number[];
}>;
//# sourceMappingURL=retriever.d.ts.map