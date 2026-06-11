import { ButtonInteraction, ComponentType, ContainerBuilder } from 'discord.js';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { Confirmable } from '@bDecorators/Confirmable';
import { InteractionHandler } from '@handlers/interaction';
import { BuilderComponent } from '@interfaces/Components';

import type { ConfirmableClassicOptions, ConfirmableOptions, RowLike } from '@bDecorators/Confirmable/types';
import type { Core } from '@interfaces/Core';

const mockCore = {} as unknown as Core;

// Mocking dependencies
const mockEvent = {
    isChatInputCommand: vi.fn(),
    isContextMenuCommand: vi.fn(),
    reply: vi.fn(),
    followUp: vi.fn(),
    editReply: vi.fn(),
    deferReply: vi.fn(),
    deferUpdate: vi.fn(),
    deleteReply: vi.fn(),
    fetchReply: vi.fn(),
    user: { id: '123' },
    deferred: false,
    replied: false,
    customId: 'original_component'
};

const mockMessage = {
    awaitMessageComponent: vi.fn(),
    edit: vi.fn(),
    delete: vi.fn(),
    deletable: true
};

const mockButton = {
    customId: 'confirm',
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    user: { id: '123' },
    componentType: ComponentType.Button
};

describe('Confirmable', () => {
    let run: () => Promise<void>;
    let originalMethod: Mock;

    beforeEach(() => {
        vi.resetAllMocks();

        // Restore implementations because resetAllMocks clears them
        mockEvent.isChatInputCommand.mockReturnValue(true);
        mockEvent.isContextMenuCommand.mockReturnValue(false);
        mockEvent.fetchReply.mockResolvedValue(mockMessage);
        mockEvent.reply.mockResolvedValue(mockMessage);
        mockEvent.editReply.mockResolvedValue(mockMessage);
        mockEvent.followUp.mockResolvedValue(mockMessage);
        mockEvent.deferReply.mockImplementation(() => {
            mockEvent.deferred = true;
            return Promise.resolve();
        });
        mockEvent.deferUpdate.mockImplementation(() => {
            mockEvent.deferred = true;
            return Promise.resolve();
        });
        mockEvent.deleteReply.mockResolvedValue(undefined);

        // Fix mutable properties
        mockEvent.deferred = false;
        mockEvent.replied = false;

        mockMessage.awaitMessageComponent.mockResolvedValue(mockButton);
        mockMessage.edit.mockResolvedValue(mockMessage);
        mockMessage.delete.mockResolvedValue(mockMessage);

        mockButton.deferUpdate.mockResolvedValue(undefined);

        originalMethod = vi.fn();
    });

    const createHandler = (options: Partial<ConfirmableOptions> = {}): (() => Promise<void>) => {
        class HandlerClass extends InteractionHandler<ButtonInteraction> {
            constructor() {
                super(mockEvent as unknown as ButtonInteraction, mockCore);
            }

            @Confirmable('Are you sure?', {
                mode: 'classic',
                prompt: 'Prompt',
                rows: [{} as RowLike],
                decision: { kind: 'customIds', confirm: ['confirm'], cancel: ['cancel'] },
                defer: true,
                ...options
            } as ConfirmableClassicOptions)
            public async execute(): Promise<void> {
                await originalMethod();
            }
        }

        const h = new HandlerClass();
        return h.execute.bind(h);
    };

    it('should defer reply for slash commands (default)', async () => {
        run = createHandler();
        await run();
        expect(mockEvent.deferReply).toHaveBeenCalled();
    });

    it('should not defer reply if defer: false', async () => {
        run = createHandler({ defer: false });
        await run();
        expect(mockEvent.deferReply).not.toHaveBeenCalled();
    });

    it('should use editReply if already deferred', async () => {
        mockEvent.deferred = true;
        run = createHandler();
        await run();
        // Should not defer again but maybeDefer might try? No, shouldDefer checks deferred.
        expect(mockEvent.deferReply).not.toHaveBeenCalled();
        // Should edit reply with prompt (since it's deferred slash)
        expect(mockEvent.editReply).toHaveBeenCalled();
    });

    it('should await component and execute original method on confirm', async () => {
        run = createHandler();
        await run();
        expect(mockMessage.awaitMessageComponent).toHaveBeenCalled();
        expect(originalMethod).toHaveBeenCalled();
    });

    it('should NOT execute original method on cancel', async () => {
        mockButton.customId = 'cancel';
        run = createHandler();
        await run();
        expect(originalMethod).not.toHaveBeenCalled();
    });

    it('should use resolver if configured and pass correct component type', async () => {
        const resolveSpy = vi.fn().mockResolvedValue(true);
        run = createHandler({
            decision: {
                kind: 'resolver',
                // @ts-expect-error since we're using a factory, we don't set the component type
                componentType: ComponentType.StringSelect,
                resolve: resolveSpy
            }
        });

        // Mock interaction to match StringSelect
        mockButton.componentType = ComponentType.StringSelect;
        mockButton.customId = 'whatever';

        await run();

        expect(mockMessage.awaitMessageComponent).toHaveBeenCalledWith(
            expect.objectContaining({
                componentType: ComponentType.StringSelect
            })
        );
        expect(resolveSpy).toHaveBeenCalled();
        expect(originalMethod).toHaveBeenCalled();
    });

    describe('Message Component Interaction Handling', () => {
        beforeEach(() => {
            mockEvent.isChatInputCommand.mockReturnValue(false);
            mockEvent.isContextMenuCommand.mockReturnValue(false);
            // Make it look like a component interaction
            mockEvent.customId = 'btn';
            mockEvent.deferUpdate = vi.fn().mockImplementation((): void => {
                mockEvent.deferred = true;
            });
        });

        it('should use deferUpdate and followUp for component interaction by default', async () => {
            run = createHandler();
            await run();

            expect(mockEvent.deferUpdate).toHaveBeenCalled(); // maybeDefer calls deferUpdate
            expect(mockEvent.followUp).toHaveBeenCalled(); // sendPrompt calls followUp because it's deferred
            expect(mockEvent.reply).not.toHaveBeenCalled();
        });

        it('should use reply if defer is false', async () => {
            run = createHandler({ defer: false });
            await run();

            expect(mockEvent.deferUpdate).not.toHaveBeenCalled();
            expect(mockEvent.reply).toHaveBeenCalled(); // sendPrompt calls reply because NOT deferred
            expect(mockEvent.followUp).not.toHaveBeenCalled();
        });

        it('should attempt to edit message for cleanup instead of deleteReply', async () => {
            run = createHandler();
            await run();

            // Cleanup logic (finalizeUi)
            // It should try msg.edit or msg.delete, NOT ix.deleteReply(msg)
            expect(mockMessage.edit).toHaveBeenCalled();
            // If edit succeeds, delete is not called (unless we wanted to clear and clearedPayload was used)
            // In classic mode, clearedPayload is empty components. We edit the message to have empty components.
            // If the message is ephemeral, editing removes components.

            expect(mockEvent.deleteReply).not.toHaveBeenCalled();
        });
    });

    describe('V2 Mode', () => {
        it('should handle V2 mode with container', async () => {
            run = createHandler({
                mode: 'v2',
                container: { component: {} } as BuilderComponent<'container'>,
                decision: { kind: 'customIds', confirm: ['confirm'] }
            });

            await run();

            // Should verify prompt payload has V2 flags
            expect(mockEvent.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    flags: 'IsComponentsV2',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    components: expect.arrayContaining([{}])
                })
            );
        });

        it('should handle replacement on cancel for V2', async () => {
            mockButton.customId = 'cancel';

            const replacementContainer = {
                component: { data: 'replacement' } as unknown as ContainerBuilder
            } as BuilderComponent<'container'>;

            run = createHandler({
                mode: 'v2',
                container: { component: {} } as BuilderComponent<'container'>,
                decision: { kind: 'customIds', confirm: ['confirm'], cancel: ['cancel'] },
                outcomeUi: {
                    onCancel: { flags: 'IsComponentsV2', components: [replacementContainer.component] },
                    onTimeout: { flags: 'IsComponentsV2', components: [] },
                    onConfirm: { flags: 'IsComponentsV2', components: [] }
                }
            });

            await run();

            // Should verify replacement call
            expect(mockEvent.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    flags: 'IsComponentsV2',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    components: expect.arrayContaining([replacementContainer.component])
                })
            );
            expect(originalMethod).not.toHaveBeenCalled();
        });
    });
});
