import type { Handler } from '../../interfaces/Handler';

type HandlerCtor = new (...args: any[]) => Handler;

/**
 * Marks a handler class as requiring check execution.
 *
 * Enables the runChecks() method to be called before execute()
 * for handlers that need pre-execution validation.
 *
 * @param ctor - The handler to mark as checkable (Do not pass this directly. Just call the decorator without a **()**)
 * @decorator
 * @example
 * ```typescript
 * \@Checkable
 * class AdminCommand extends InteractionHandler {
 *   async runChecks() {
 *     // Perform admin permission checks
 *   }
 * }
 * ```
 */
export function Checkable<TypeHandler extends HandlerCtor>(ctor: TypeHandler): TypeHandler {
  return class extends ctor {
    static override name = ctor.name;
    checkable = true as const;
  };
}
