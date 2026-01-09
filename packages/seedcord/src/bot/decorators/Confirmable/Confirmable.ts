import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';

import { createAdapter } from './adapters';
import { decide } from './decision';
import { awaitComponent, finalizeUi, maybeDefer, sendPrompt } from './flow';

import type {
    ComponentInteractionFor,
    ConfirmableContext,
    ConfirmableOptions,
    ConfirmableResolution,
    ConfirmableQuestionInput
} from './types';
import type { RepliableInteractionHandler } from '@interfaces/Handler';
import type { MessageComponentType, ComponentType } from 'discord.js';

/**
 * Wraps a repliable handler method with an interactive confirmation flow.
 *
 * Displays a prompt, waits for a follow-up component interaction, and conditionally executes the original method
 * based on the user's decision. The decorator supports both classic action rows + embed/content and ComponentV2 containers.
 *
 * @example
 * ### Classic Mode (Buttons)
 * ```ts
 * class BanHandler extends InteractionHandler {
 *   \@Confirmable('Are you sure you want to ban this user?', {
 *      mode: 'classic',
 *      decision: { kind: 'customIds', confirm: ['confirm_ban'], cancel: ['cancel_ban'] },
 *      rows: rowFactory, // Returns ActionRow or button factory
 *      prompt: 'Please confirm this action.',
 *      ephemeral: true
 *   })
 *   public async execute() {
 *     // Only runs if confirmed
 *     await this.target.ban();
 *   }
 * }
 * ```
 *
 * @example
 * ### Classic Mode (Select Menu with Resolver)
 * ```ts
 * class RoleHandler extends InteractionHandler {
 *   \@Confirmable('Choose a role to assign', {
 *      mode: 'classic',
 *      // Use a custom resolver function instead of ID matching
 *      decision: {
 *          kind: 'resolver',
 *          componentType: ComponentType.StringSelect,
 *          resolve: async (i) => i.values[0] === 'admin_role'
 *      },
 *      rows: selectMenuRowFactory,
 *      prompt: 'Select a role below:'
 *   })
 *   public async execute() {
 *     // Executed if resolver returned true
 *   }
 * }
 * ```
 *
 * @example
 * ### V2 Mode (Container)
 * ```ts
 * class SettingsHandler extends InteractionHandler {
 *   \@Confirmable(async () => `Update settings for ${this.user.username}?`, {
 *      mode: 'v2',
 *      container: containerFactory, // Returns ContainerBuilder
 *      decision: { kind: 'customIds', confirm: ['save_settings'] }
 *   })
 *   public async execute() {
 *     // Save settings
 *   }
 * }
 * ```
 *
 * @typeParam TComponent - Message component type that should resolve the confirmation.
 * @param question - Static string or lazy factory that resolves the prompt question.
 * @param options - Confirmation flow configuration.
 * @decorator
 * @beta
 */
export function Confirmable<TComponent extends MessageComponentType = ComponentType.Button>(
    question: ConfirmableQuestionInput,
    options: ConfirmableOptions<TComponent>
) {
    return function <TArgs extends unknown[]>(
        _target: RepliableInteractionHandler,
        _propertyKey: string,
        descriptor: TypedPropertyDescriptor<(...args: TArgs) => Promise<void>>
    ): TypedPropertyDescriptor<(...args: TArgs) => Promise<void>> {
        const original = descriptor.value;

        // eslint-disable-next-line max-statements
        descriptor.value = async function (this: RepliableInteractionHandler, ...args: TArgs): Promise<void> {
            if (!original) throw new SeedcordError(SeedcordErrorCode.DecoratorMethodNotFound);

            const ix = this.getEvent();
            const isSlash = ix.isChatInputCommand();
            const isContext = ix.isContextMenuCommand();
            const { ephemeral = true } = options;

            await maybeDefer(ix, options, isSlash, isContext);

            const q = typeof question === 'function' ? await question.apply(this) : question;

            const ctx: ConfirmableContext = { handler: this, interaction: ix, question: q };
            const adapter = createAdapter(options);

            const promptPayload = await adapter.buildPrompt(ctx);
            const promptMsg = await sendPrompt(ix, promptPayload, ephemeral, isSlash, isContext);

            const { button, timedOut } = await awaitComponent(promptMsg, ix, options);

            let confirmed = false;
            if (button) {
                // Acknowledge the interaction to prevent timeout spinner
                await button.deferUpdate().catch(() => undefined);
                confirmed = await decide(options, button);
            }

            const replacement = await adapter.getReplacement(ctx, confirmed, timedOut);

            if (replacement) {
                await finalizeUi(ix, promptMsg, replacement, isSlash, isContext);
            } else {
                await finalizeUi(ix, promptMsg, adapter.clearedPayload(), isSlash, isContext);
            }

            if (options.onResolved) {
                try {
                    const resolution: ConfirmableResolution<TComponent> = {
                        confirmed,
                        timedOut,
                        handler: this,
                        interaction: ix,
                        question: q,
                        ...(button ? { button: button as ComponentInteractionFor<TComponent> } : {})
                    };
                    await options.onResolved(resolution);
                } catch {
                    // Suppress error in callback
                }
            }

            if (confirmed) {
                await original.apply(this, args);
            }
        };

        return descriptor;
    };
}
