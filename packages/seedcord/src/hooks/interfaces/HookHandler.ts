import type { Core } from '../../interfaces/Core';
import type { AllHooks, HookKeys } from '../types/Hooks';

export abstract class HookHandler<KeyOfHooks extends HookKeys> {
  constructor(
    protected readonly data: AllHooks[KeyOfHooks],
    protected readonly core: Core
  ) {
    this.data = data;
    this.core = core;
  }

  abstract execute(): Promise<void>;
}
