import { IComponent } from '../interfaces/IComponent';
import { IEntity } from '../interfaces/IEntity';

export abstract class Entity implements IEntity {
  protected components: Map<string, IComponent> = new Map();
  public sprite!: Phaser.GameObjects.Sprite;

  addComponent<T extends IComponent>(key: string, component: T): T {
    this.components.set(key, component);
    return component;
  }

  getComponent<T extends IComponent>(key: string): T {
    const component = this.components.get(key);
    if (!component) {
      throw new Error(`Component "${key}" not found on entity`);
    }
    return component as T;
  }

  update(delta: number): void {
    this.components.forEach((c) => c.update(delta));
  }

  destroy(): void {
    this.components.forEach((c) => c.destroy());
    this.components.clear();
  }
}
