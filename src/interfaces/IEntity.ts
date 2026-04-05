export interface IEntity {
  update(delta: number): void;
  destroy(): void;
}
