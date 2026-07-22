import { ButtonRoute, CustomId, ModalRoute } from '@seedcord/core';

import { ButtonHandler } from '@handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '@handlers/interaction/components/ModalHandler';

export const ConfirmId = new CustomId('discoveryconfirm').str('subject');
const NoteModalId = new CustomId('discoverynote').str('subject');

@ButtonRoute(ConfirmId)
export class ConfirmButton extends ButtonHandler<[typeof ConfirmId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

@ModalRoute(NoteModalId)
export class NoteModal extends ModalHandler<[typeof NoteModalId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
