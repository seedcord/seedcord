import { ButtonBuilder, TextDisplayBuilder } from '@discordjs/builders';
import { BuilderComponent, RowComponent } from '@seedcord/core';
import { ButtonStyle, ComponentType } from 'discord.js';

import { ReplySender } from '@bot/ReplySender';

import { CONFIRM_DEF } from './reserved';

import type { NonModalInteraction, Repliables } from '@handlers/BaseHandler';
import type { ReplyResponse } from '@seedcord/types';
import type { ButtonInteraction, Message } from 'discord.js';
import type { Promisable } from 'type-fest';

const DEFAULT_TIMEOUT_MS = 30_000;

// the reserved def's shape and choices never change, so mint the ids once.
const CONFIRM_IDS = {
    confirm: CONFIRM_DEF.encode({ choice: 'confirm' }),
    cancel: CONFIRM_DEF.encode({ choice: 'cancel' })
};

/** A confirm outcome to show, the reply itself or a factory for it. */
type Outcome = ReplyResponse | (() => Promisable<ReplyResponse>);

// the prompt a confirmation shows, a string convenience form or a factory that gets the two minted ids.
type ConfirmPrompt = string | ((ids: { confirm: string; cancel: string }) => Promisable<ReplyResponse>);

/** Options shared by both confirmation forms. */
export interface ConfirmOptions {
    /**
     * Whether the prompt is ephemeral. Only the invoking user can act on it either way, a non-invoker's
     * click is ignored.
     *
     * @defaultValue `true`
     */
    ephemeral?: boolean;
    /**
     * Milliseconds to wait for a click before the prompt is settled and the result resolves to `false`.
     *
     * @defaultValue `30_000`
     */
    timeoutMs?: number;
    /** Shown in place of the prompt when the user confirms. Absent removes the prompt. */
    onConfirm?: Outcome;
    /** Shown in place of the prompt when the user cancels. Absent removes the prompt. */
    onCancel?: Outcome;
    /** Shown in place of the prompt when the prompt times out. Absent removes the prompt. */
    onTimeout?: Outcome;
}

/** Options for the string-prompt form, adding the built-in Confirm/Cancel buttons' labels and style. */
export interface DefaultConfirmOptions extends ConfirmOptions {
    /**
     * Confirm-button label.
     *
     * @defaultValue `'Confirm'`
     */
    confirmLabel?: string;
    /**
     * Cancel-button label.
     *
     * @defaultValue `'Cancel'`
     */
    cancelLabel?: string;
    /**
     * Confirm-button style.
     *
     * @defaultValue {@link ButtonStyle.Danger}
     */
    confirmStyle?: ButtonStyle;
}

class ConfirmButtons extends RowComponent<'button'> {
    constructor(options: DefaultConfirmOptions | undefined) {
        super('button');
        this.instance.addComponents(
            new ButtonBuilder()
                .setCustomId(CONFIRM_IDS.confirm)
                .setLabel(options?.confirmLabel ?? 'Confirm')
                .setStyle(options?.confirmStyle ?? ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(CONFIRM_IDS.cancel)
                .setLabel(options?.cancelLabel ?? 'Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
    }
}

class ConfirmPromptCard extends BuilderComponent<'container'> {
    constructor(text: string, options: DefaultConfirmOptions | undefined) {
        super('container');
        this.instance
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
            .addActionRowComponents(new ConfirmButtons(options).component);
    }
}

function defaultPrompt(text: string, options: DefaultConfirmOptions | undefined): ReplyResponse {
    return { components: [new ConfirmPromptCard(text, options).component] };
}

async function collectChoice(message: Message, userId: string, timeoutMs: number): Promise<ButtonInteraction | null> {
    try {
        return await message.awaitMessageComponent({
            componentType: ComponentType.Button,
            time: timeoutMs,
            filter: (click) => click.user.id === userId && CONFIRM_DEF.owns(click.customId)
        });
    } catch {
        // awaitMessageComponent rejects on timeout, a clean "no decision", not an error.
        return null;
    }
}

// settle the prompt for an outcome, edit it to the author's reply, or remove it when no hook was given.
async function settle(
    sender: ReplySender,
    interaction: Repliables,
    message: Message,
    outcome: Outcome | undefined
): Promise<void> {
    if (outcome === undefined) {
        // deleteReply routes through the interaction webhook, so it removes an ephemeral prompt where a
        // plain message.delete() cannot.
        await interaction.deleteReply(message).catch(() => undefined);
        return;
    }
    await sender.edit(message, typeof outcome === 'function' ? await outcome() : outcome);
}

/**
 * Shows a confirm/cancel prompt with built-in Confirm and Cancel buttons and resolves to `true` only if the
 * invoking user clicks confirm. A cancel click or a timeout resolves to `false`. Gate the action behind it
 * with an early return. Never throws, a swallowed send resolves to `false`. Not usable from a
 * {@link ModalHandler}, the `interaction` parameter excludes a modal submit at compile time.
 *
 * @param interaction - The repliable interaction to prompt on, `this.event` inside a non-modal handler.
 * @param prompt - The message shown above the Confirm and Cancel buttons.
 * @param options - Ephemeral flag, timeout, the built-in buttons' labels and style, and the optional
 *   `onConfirm`/`onCancel`/`onTimeout` outcome replies that edit the prompt in place.
 * @returns `true` if confirmed, `false` on cancel or timeout.
 *
 * @example
 * ```ts
 * import { getConfirmation } from '@seedcord/gateway';
 *
 * \@SlashRoute('ban')
 * class BanHandler extends SlashHandler<'ban'> {
 *     async execute() {
 *         const target = this.options.getUser('target', true);
 *         if (!(await getConfirmation(this.event, `Ban ${target.tag}? This cannot be undone.`))) return;
 *         await this.event.guild?.members.ban(target.id);
 *     }
 * }
 * ```
 */
export function getConfirmation(
    interaction: NonModalInteraction,
    prompt: string,
    options?: DefaultConfirmOptions
): Promise<boolean>;
/**
 * Shows a confirm/cancel prompt you build yourself and resolves to `true` only if the invoking user clicks
 * confirm. The factory receives the two minted button ids, set them on your own buttons. A cancel click or a
 * timeout resolves to `false`. Never throws. Not usable from a {@link ModalHandler}.
 *
 * @param interaction - The repliable interaction to prompt on, `this.event` inside a non-modal handler.
 * @param prompt - A factory given the minted `{ confirm, cancel }` ids that returns the reply to show. Build
 *   it with the kit `BuilderComponent`/`RowComponent` wrappers, not raw discord.js builders.
 * @param options - Ephemeral flag, timeout, and the optional `onConfirm`/`onCancel`/`onTimeout` outcome
 *   replies that edit the prompt in place.
 * @returns `true` if confirmed, `false` on cancel or timeout.
 *
 * @remarks
 * The prompt is collected in-process, so it does not survive a bot restart. Without an outcome hook, deliver
 * a result after confirming with a fresh `interaction.followUp(...)`, the prompt is already gone.
 *
 * @example
 * ```ts
 * import { ButtonBuilder, TextDisplayBuilder } from '@discordjs/builders';
 * import { ButtonStyle } from 'discord.js';
 * import { BuilderComponent, RowComponent, getConfirmation } from '@seedcord/gateway';
 *
 * class BanPrompt extends BuilderComponent<'container'> {
 *     constructor(text: string) {
 *         super('container');
 *         this.instance.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
 *     }
 * }
 *
 * class ConfirmRow extends RowComponent<'button'> {
 *     constructor(ids: { confirm: string; cancel: string }) {
 *         super('button');
 *         const buttons = [
 *             [ids.confirm, 'Ban', ButtonStyle.Danger],
 *             [ids.cancel, 'Cancel', ButtonStyle.Secondary]
 *         ] as const;
 *         this.instance.addComponents(
 *             ...buttons.map(([id, label, style]) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style))
 *         );
 *     }
 * }
 *
 * const target = this.options.getUser('target', true);
 * const confirmed = await getConfirmation(
 *     this.event,
 *     (ids) => ({ components: [new BanPrompt(`Ban ${target.tag}?`).component, new ConfirmRow(ids).component] }),
 *     { onConfirm: { components: [new BanPrompt(`Banned ${target.tag}.`).component] } }
 * );
 * if (!confirmed) return;
 * ```
 */
export function getConfirmation(
    interaction: NonModalInteraction,
    prompt: (ids: { confirm: string; cancel: string }) => Promisable<ReplyResponse>,
    options?: ConfirmOptions
): Promise<boolean>;
export async function getConfirmation(
    interaction: NonModalInteraction,
    prompt: ConfirmPrompt,
    options?: DefaultConfirmOptions
): Promise<boolean> {
    const { ephemeral = true, timeoutMs = DEFAULT_TIMEOUT_MS } = options ?? {};

    const response = typeof prompt === 'string' ? defaultPrompt(prompt, options) : await prompt(CONFIRM_IDS);
    const sender = new ReplySender(interaction);
    const message = await sender.send(response, ephemeral);
    // a swallowed send means the prompt never showed, so there is nothing to settle, collect, or run.
    if (!message) return false;

    const winner = await collectChoice(message, interaction.user.id, timeoutMs);
    if (!winner) {
        await settle(sender, interaction, message, options?.onTimeout);
        return false;
    }

    await winner.deferUpdate().catch(() => undefined);
    const confirmed = winner.customId === CONFIRM_IDS.confirm;
    await settle(sender, interaction, message, confirmed ? options?.onConfirm : options?.onCancel);
    return confirmed;
}
