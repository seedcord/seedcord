import { EventEmitter } from 'events';

import type { AllHooks, HookKeys } from './types/Hooks';

export class HookEmitter {
  private readonly emitter = new EventEmitter();

  public on<KeyOfHooks extends HookKeys>(event: KeyOfHooks, listener: (data: AllHooks[KeyOfHooks]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  public once<KeyOfHooks extends HookKeys>(event: KeyOfHooks, listener: (data: AllHooks[KeyOfHooks]) => void): this {
    this.emitter.once(event, listener);
    return this;
  }

  public emit<KeyOfHooks extends HookKeys>(event: KeyOfHooks, data: AllHooks[KeyOfHooks]): boolean {
    return this.emitter.emit(event, data);
  }
}
