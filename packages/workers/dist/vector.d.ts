export default function vector(job: {
    op: 'upsert' | 'query';
    vectors?: number[][];
    topK?: number;
}): Promise<{
    upserted: number;
    ids?: undefined;
    scores?: undefined;
} | {
    ids: string[];
    scores: number[];
    upserted?: undefined;
} | undefined>;
//# sourceMappingURL=vector.d.ts.map
