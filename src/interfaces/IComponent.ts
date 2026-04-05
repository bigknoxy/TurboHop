export interface IComponent {
  update(delta: number): void;
  destroy(): void;
}
