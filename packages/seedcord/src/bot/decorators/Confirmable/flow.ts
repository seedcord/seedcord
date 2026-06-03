import { ComponentType, type Message, type MessageComponentInteraction, type MessageComponentType } from 'discord.js';

import { isMessageComponentIx } from './utils';

import type { ConfirmableOptions, ConfirmablePayload } from './types';
import type { Repliables } from '@interfaces/Handler';

export function shouldDefer<TComponentType extends MessageComponentType>(
    ix: Repliables,
    opts: ConfirmableOptions<TComponentType>,
    _isSlash: boolean,
    _isContext: boolean
): boolean {
    if (ix.deferred || ix.replied) return false;
    // If user explicitly forbids defer, respect it entirely as we will reply immediately in sendPrompt
    if (opts.defer === false) {
        return false;
    }

    // Otherwise, for safety, always defer components to avoid interaction failed
    return true;
}

export async function maybeDefer<TComponentType extends MessageComponentType>(
    ix: Repliables,
    opts: ConfirmableOptions<TComponentType>,
    isSlash: boolean,
    isContext: boolean
): Promise<void> {
    if (!shouldDefer(ix, opts, isSlash, isContext)) return;

    if (isSlash || isContext) {
        const { ephemeral = true } = opts;
        const flags = ephemeral ? { flags: 'Ephemeral' as const } : undefined;
        if (flags) await ix.deferReply(flags);
        else await ix.deferReply();
    } else if (isMessageComponentIx(ix)) {
        await ix.deferUpdate();
    } else {
        // Fallback for unknown interaction types
        await ix.deferReply().catch(() => undefined);
    }
}

export async function sendPrompt(
    ix: Repliables,
    payload: ConfirmablePayload,
    ephemeral: boolean,
    isSlash: boolean,
    isContext: boolean
): Promise<Message> {
    // 1. Slash or context: prompt should be the primary reply.
    if (isSlash || isContext) {
        // Use editReply if deferred or already replied
        if (ix.deferred || ix.replied) {
            return ix.editReply(payload as Parameters<typeof ix.editReply>[0]);
        }
        // else reply then fetchReply
        const reply = { ...payload, ...(ephemeral ? { flags: 'Ephemeral' } : {}) } as Parameters<typeof ix.reply>[0];
        await ix.reply(reply);
        return ix.fetchReply();
    }

    // 2. Message component interaction (e.g. Button click)
    // Prompt should usually be a new ephemeral reply to the click.
    // If the click was not acknowledged (not deferred, not replied), use reply.
    // Else use followUp (new floaty message) only if you are certain it exists.

    // Check acknowledgment
    if (!ix.deferred && !ix.replied) {
        // Not acknowledged -> Reply (ACK + Send Message)
        const reply = { ...payload, ...(ephemeral ? { flags: 'Ephemeral' } : {}) } as Parameters<typeof ix.reply>[0];
        // Note: ix.reply on component sends a new message (ephemeral or not) and ACKs.
        await ix.reply(reply);
        return ix.fetchReply();
    }

    // Already Acknowledged (likely via deferUpdate or deferReply in maybeDefer)
    // Send a followup message (new floaty message or new message in channel).
    const follow = { ...payload, ...(ephemeral ? { flags: 'Ephemeral' } : {}) } as Parameters<typeof ix.followUp>[0];
    return ix.followUp(follow);
}

export async function awaitComponent<TComponentType extends MessageComponentType>(
    msg: Message,
    original: Repliables,
    opts: ConfirmableOptions<TComponentType>
): Promise<{ button: MessageComponentInteraction | null; timedOut: boolean }> {
    // Determine component type logic:
    // If defaults to Button if undefined.
    // If using customIds, check componentType in options (if added) or default.
    // If resolver, use resolver's componentType.

    let componentType: MessageComponentType = ComponentType.Button;
    const { decision } = opts;

    if (decision.kind === 'resolver') {
        componentType = decision.componentType;
    } else {
        // Using the new optional property or default
        componentType = decision.componentType ?? ComponentType.Button;
    }

    const timeoutMs = opts.timeoutMs ?? 10_000;

    try {
        const button = await msg.awaitMessageComponent({
            componentType,
            time: timeoutMs,
            filter: (c) => {
                if (c.user.id !== original.user.id) return false;
                if (decision.kind === 'customIds') {
                    const { confirm, cancel = [] } = decision;
                    return confirm.includes(c.customId) || cancel.includes(c.customId);
                }
                return true;
            }
        });
        return { button, timedOut: false };
    } catch {
        return { button: null, timedOut: true };
    }
}

export async function finalizeUi(
    ix: Repliables,
    msg: Message,
    payload: ConfirmablePayload,
    isSlash: boolean,
    isContext: boolean
): Promise<void> {
    // Unified logic for clearing or replacing the prompt.
    // 1. Try msg.edit if msg is editable (prefer editing the prompt message)
    // 2. If slash or context, try ix.editReply (if msg.edit failed or as primary path?)
    //    User said: "For non slash: prefer msg.edit(clear) then msg.delete() if deletable."
    //    User said: "Slash or context: ... use editReply" implies editing the response.

    if (isSlash || isContext) {
        // Interaction reply (slash/context)
        await ix
            .editReply(payload as Parameters<typeof ix.editReply>[0])
            .catch(() => ix.deleteReply().catch(() => undefined));
    } else {
        // Component interaction
        try {
            await msg.edit(payload as Parameters<typeof msg.edit>[0]);
        } catch {
            // Edit can fail (ephemeral expired, lost perms). Only delete if deletable; deleting via interaction is not a fallback for a normal message.
            if (msg.deletable) {
                await msg.delete().catch(() => undefined);
            }
        }
    }
}
