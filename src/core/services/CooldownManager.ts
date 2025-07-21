import { LogService } from './LogService';
import { Globals } from '../library/globals/Globals';

export interface CooldownOptions {
  // Cooldown window in milliseconds (default 1 000)
  cooldown?: number;
  // Custom error class to throw when a key is still cooling down
  err?: new (msg: string, ...args: any[]) => Error;
  // Message passed to the error constructor (default "Cooldown active")
  message?: string;
}

/**
 * Lightweight utility for per-key cooldowns
 */
export class CooldownManager {
  private readonly window: number;
  private readonly Err: new (msg: string, ...args: any[]) => Error;
  private readonly msg: string;
  private readonly map = new Map<string, number>();

  constructor(opts: CooldownOptions = {}) {
    this.window = opts.cooldown ?? 1_000;
    this.Err = opts.err ?? Error;
    this.msg = opts.message ?? 'Cooldown active';
  }

  /** Record usage without any checks. */
  set(key: string): void {
    this.map.set(key, Date.now());
  }

  /**
   * Verify cooldown for `key`.\
   * If active → throws the custom error.\
   * If not active → updates timestamp and returns void.
   */
  check(key: string): void {
    const now = Date.now();
    const last = this.map.get(key);
    const remaining = this.window - (now - (last ?? 0));

    if (Globals.isDevelopment && remaining > 0) {
      LogService.Debug('CooldownManager', `${key} - ${remaining}ms remaining`);
    }

    if (last !== undefined && remaining > 0) {
      throw new this.Err(this.msg, remaining);
    }
    this.map.set(key, now);
  }

  /** Returns true if the key is still cooling down (does not update timestamp). */
  isActive(key: string): boolean {
    const last = this.map.get(key);
    return last !== undefined && Date.now() - last < this.window;
  }

  /** Remove a key from the map (useful for manual resets). */
  clear(key: string): void {
    this.map.delete(key);
  }
}
