import { HookedEvents } from './Hooks';

export abstract class HookHandler<T extends keyof HookedEvents> {
  protected data: HookedEvents[T];

  constructor(data: HookedEvents[T]) {
    this.data = data;
  }

  abstract execute(): Promise<void>;
}
