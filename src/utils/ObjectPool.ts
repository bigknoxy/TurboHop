export class ObjectPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private factory: () => T;

  constructor(factory: () => T, initialSize: number = 0) {
    this.factory = factory;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  get(): T {
    const item = this.pool.pop() ?? this.factory();
    this.active.add(item);
    return item;
  }

  release(item: T): void {
    this.active.delete(item);
    this.pool.push(item);
  }

  forEach(fn: (item: T) => void): void {
    this.active.forEach(fn);
  }

  getActive(): Set<T> {
    return this.active;
  }

  get activeCount(): number {
    return this.active.size;
  }
}
