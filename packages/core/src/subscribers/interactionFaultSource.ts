import type { InteractionDispatch } from '#src/dispatch/DispatchContext';
import type { InteractionKind } from '#src/metadataKeys';
import type { InteractionFaultSource } from '#subscribers/types/Subscriptions';
import type { TypedOmit } from '@seedcord/types';

type FaultKind = InteractionFaultSource['interactionKind'];

const FAULT_KINDS: Record<`${InteractionKind}`, FaultKind | null> = {
    slash: 'slash',
    userContextMenu: 'context-menu',
    messageContextMenu: 'context-menu',
    button: 'button',
    stringMenu: 'select',
    userMenu: 'select',
    roleMenu: 'select',
    channelMenu: 'select',
    mentionableMenu: 'select',
    modal: 'modal',
    // an autocomplete throw doesn't have a typed source
    autocomplete: null
};

export function interactionFaultSource(
    dispatch: InteractionDispatch,
    fields: TypedOmit<InteractionFaultSource, 'kind' | 'interactionKind' | 'command'>
): InteractionFaultSource | null {
    const interactionKind = FAULT_KINDS[dispatch.kind];
    if (interactionKind === null) return null;
    const isCommand = interactionKind === 'slash' || interactionKind === 'context-menu';
    return { kind: 'interaction', interactionKind, command: isCommand ? dispatch.route : null, ...fields };
}
