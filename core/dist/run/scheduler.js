export class Scheduler {
    steps = Infinity;
    cancelled = false;
    waiters = [];
    notify() {
        for (const w of this.waiters)
            w();
        this.waiters = [];
    }
    pause() {
        if (this.steps !== 0)
            this.steps = 0;
    }
    resume() {
        if (this.cancelled)
            return;
        this.steps = Infinity;
        this.notify();
    }
    cancel() {
        this.cancelled = true;
        this.notify();
    }
    step() {
        if (this.cancelled)
            return;
        if (this.steps === Infinity)
            this.steps = 0;
        this.steps++;
        this.notify();
    }
    async next() {
        if (this.cancelled)
            throw new Error("cancelled");
        if (this.steps === 0) {
            await new Promise((resolve) => this.waiters.push(resolve));
            if (this.cancelled)
                throw new Error("cancelled");
        }
        if (this.steps !== Infinity)
            this.steps--;
    }
}
