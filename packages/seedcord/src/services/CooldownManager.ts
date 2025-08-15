import { Logger } from './Logger';
import { Globals } from '../library/Globals';

/**
 * Configuration options for CooldownManager.
 */
export interface CooldownOptions {
  /** Cooldown window in milliseconds (default 1000) */
  cooldown?: number;
  /** Custom error class to throw when a key is still cooling down */
  err?: new (msg: string, ...args: any[]) => Error;
  /** Message passed to the error constructor (default "Cooldown active") */
  message?: string;
}

/**
 * Lightweight utility for per-key cooldowns.
 *
 * Manages time-based restrictions on operations by key,
 * useful for rate limiting, command cooldowns, and spam prevention.
 */
export class CooldownManager {
  private readonly window: number;
  private readonly Err: new (msg: string, ...args: any[]) => Error;
  private readonly msg: string;
  private readonly map = new Map<string, number>();

  /**
   * Creates a new CooldownManager instance.
   *
   * @param opts - Configuration options for the cooldown behavior
   */
  constructor(opts: CooldownOptions = {}) {
    this.window = opts.cooldown ?? 1_000;
    this.Err = opts.err ?? Error;
    this.msg = opts.message ?? 'Cooldown active';
  }

  /**
   * Records usage timestamp for a key without any cooldown checks.
   *
   * @param key - The unique identifier for the cooldown entry
   */
  set(key: string): void {
    this.map.set(key, Date.now());
  }

  /**
   * Verifies cooldown status for a key and updates timestamp if not active.
   *
   * If the cooldown is still active, throws the configured error.
   * If not active, updates the timestamp and returns successfully.
   *
   * @param key - The unique identifier to check cooldown for
   * @throws An {@link Err} When the cooldown is still active for the given key
   */
  check(key: string): void {
    const now = Date.now();
    const last = this.map.get(key);
    const remaining = this.window - (now - (last ?? 0));

    if (Globals.isDevelopment && remaining > 0) {
      Logger.Debug('CooldownManager', `${key} - ${remaining}ms remaining`);
    }

    if (last !== undefined && remaining > 0) {
      throw new this.Err(this.msg, remaining);
    }
    this.map.set(key, now);
  }

  /**
   * Checks if a key is currently cooling down without updating timestamp.
   *
   * @param key - The unique identifier to check
   * @returns True if the key is still cooling down, false otherwise
   */
  isActive(key: string): boolean {
    const last = this.map.get(key);
    return last !== undefined && Date.now() - last < this.window;
  }

  /**
   * Removes a key from the cooldown map.
   *
   * @param key - The unique identifier to remove (useful for manual resets)
   */
  clear(key: string): void {
    this.map.delete(key);
  }
}
