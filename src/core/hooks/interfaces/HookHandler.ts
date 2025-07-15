import { AllHooks, HookKeys } from '../types/Hooks';

export abstract class HookHandler<T extends HookKeys> {
  protected data: AllHooks[T];

  constructor(data: AllHooks[T]) {
    this.data = data;
  }

  abstract execute(): Promise<void>;
}
