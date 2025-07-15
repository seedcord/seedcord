import EventEmitter from 'events';
import { AllHooks, HookKeys } from './types/Hooks';

export class HookEmitter {
  private emitter = new EventEmitter();

  public on<E extends HookKeys>(event: E, listener: (data: AllHooks[E]) => void) {
    this.emitter.on(event, listener);
    return this;
  }

  public once<E extends HookKeys>(event: E, listener: (data: AllHooks[E]) => void) {
    this.emitter.once(event, listener);
    return this;
  }

  public emit<E extends HookKeys>(event: E, data: AllHooks[E]) {
    return this.emitter.emit(event, data);
  }
}
