export class Scheduler {
  private steps: number = Infinity;
  private cancelled = false;
  private waiters: Array<() => void> = [];

  private notify() {
    for (const w of this.waiters) w();
    this.waiters = [];
  }

  pause(): void {
    if (this.steps !== 0) this.steps = 0;
  }

  resume(): void {
    if (this.cancelled) return;
    this.steps = Infinity;
    this.notify();
  }

  cancel(): void {
    this.cancelled = true;
    this.notify();
  }

  step(): void {
    if (this.cancelled) return;
    if (this.steps === Infinity) this.steps = 0;
    this.steps++;
    this.notify();
  }

  async next(): Promise<void> {
    if (this.cancelled) throw new Error("cancelled");
    if (this.steps === 0) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
      if (this.cancelled) throw new Error("cancelled");
    }
    if (this.steps !== Infinity) this.steps--;
  }
}

