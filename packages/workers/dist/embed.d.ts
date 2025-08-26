export default function embed(job: {
    text: string;
}): Promise<{
    values: number[];
    dim: number;
}>;
