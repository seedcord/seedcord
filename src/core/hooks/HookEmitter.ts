import EventEmitter from 'events';
import { HookedEvents } from './interfaces/Hooks';

export class HookEmitter {
  private emitter = new EventEmitter();

  public on<E extends keyof HookedEvents>(event: E, listener: (data: HookedEvents[E]) => void) {
    this.emitter.on(event, listener);
    return this;
  }

  public once<E extends keyof HookedEvents>(event: E, listener: (data: HookedEvents[E]) => void) {
    this.emitter.once(event, listener);
    return this;
  }

  public emit<E extends keyof HookedEvents>(event: E, data: HookedEvents[E]) {
    return this.emitter.emit(event, data);
  }
}
