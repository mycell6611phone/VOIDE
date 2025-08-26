export default function retr(job: {
    query: number[];
    topK: number;
}): Promise<{
    ids: string[];
    scores: number[];
}>;
