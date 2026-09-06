import { ContainerBuilder } from '@discordjs/builders';

import { getConfirmation } from '#bot/confirm';

import type { ButtonHandler } from '#handlers/interaction/components/ButtonHandler';
import type { ModalHandler } from '#handlers/interaction/components/ModalHandler';

function probe(button: ButtonHandler<never>, modal: ModalHandler<never>): void {
    void getConfirmation(button, 'sure?');
    void getConfirmation(button, () => ({ components: [new ContainerBuilder()] }), {
        onConfirm: { components: [new ContainerBuilder()] }
    });
    // @ts-expect-error getConfirmation excludes a modal handler
    void getConfirmation(modal, 'sure?');
}

void probe;
