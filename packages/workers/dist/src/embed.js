export default async function embed(job) {
    const dim = 64;
    const values = new Array(dim).fill(0).map((_, i) => {
        const code = job.text.charCodeAt(i % job.text.length) || 0;
        return ((code % 97) / 97) * Math.sin((i + 1) * 0.17);
    });
    return { values, dim };
}
