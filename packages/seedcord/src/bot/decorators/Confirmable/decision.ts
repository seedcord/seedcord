import type { ConfirmableOptions, ComponentInteractionFor } from './types';
import type { MessageComponentInteraction, MessageComponentType } from 'discord.js';

export async function decide<TComponentType extends MessageComponentType>(
    opts: ConfirmableOptions<TComponentType>,
    i: MessageComponentInteraction
): Promise<boolean> {
    const { decision } = opts;
    if (decision.kind === 'resolver') {
        // `i` matches `componentType` (guaranteed in `awaitComponent`)
        return decision.resolve(i as ComponentInteractionFor<TComponentType>);
    }

    // Custom IDs
    const { confirm, cancel = [] } = decision;
    if (confirm.includes(i.customId)) return true;
    if (cancel.includes(i.customId)) return false;

    return false;
}
