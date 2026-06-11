import type { Handler } from '@handlers/BaseHandler';
import type { Constructor } from 'type-fest';

/**
 * Marks a handler class as requiring check execution.
 *
 * Enables the runChecks() method to be called before execute()
 * for handlers that need pre-execution validation.
 *
 * @typeParam TypeHandler - The type of the handler class being decorated
 * @param ctor - The handler to mark as checkable (Do not pass this directly. Just call the decorator without a `()`)
 * @decorator
 * @example
 * ```ts
 * \@Checkable
 * \@SlashRoute('ban')
 * class BanHandler extends SlashHandler<'ban'> implements WithChecks {
 *   \@Catchable()
 *   async runChecks() {
 *     if (!this.event.memberPermissions?.has('BanMembers')) throw new Error('Missing permission');
 *   }
 *
 *   \@Catchable()
 *   async execute() {
 *     await this.event.reply('banned');
 *   }
 * }
 * ```
 */
export function Checkable<TypeHandler extends Constructor<Handler>>(ctor: TypeHandler): TypeHandler {
    return class extends ctor {
        static override name = ctor.name;
        checkable = true as const;
    };
}
