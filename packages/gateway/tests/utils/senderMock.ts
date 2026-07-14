import { vi } from 'vitest';

import { ReplySender } from '@bot/ReplySender';

import type { SentMessage } from '@bot/ReplySender';
import type { Repliables } from '@handlers/BaseHandler';

const ROUTE = 'button:page';

export const message = { id: 'msg-1' } as SentMessage;
const withResponse = { resource: { message } };

// the seed flags and the kind guards default to a fresh message-component interaction (has a source message)
export interface FlagOverrides {
    deferred?: boolean;
    replied?: boolean;
    ephemeral?: boolean | null;
    isMessageComponent?: boolean;
    isModalSubmit?: boolean;
    isFromMessage?: boolean;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types -- inference is fine here
export function mockInteraction(overrides: FlagOverrides = {}) {
    const {
        deferred = false,
        replied = false,
        ephemeral = null,
        isMessageComponent = true,
        isModalSubmit = false,
        isFromMessage = false
    } = overrides;
    return {
        reply: vi.fn().mockResolvedValue(withResponse),
        deferReply: vi.fn().mockResolvedValue(undefined),
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(withResponse),
        followUp: vi.fn().mockResolvedValue(message),
        editReply: vi.fn().mockResolvedValue(message),
        showModal: vi.fn().mockResolvedValue(undefined),
        webhook: { editMessage: vi.fn().mockResolvedValue(message) },
        isMessageComponent: () => isMessageComponent,
        isModalSubmit: () => isModalSubmit,
        isFromMessage: () => isFromMessage,
        deferred,
        replied,
        ephemeral
    };
}

// justified: the fixture implements only the Repliables surface ReplySender reads.
export function senderFor(mock: ReturnType<typeof mockInteraction>): ReplySender {
    // eslint-disable-next-line no-restricted-syntax -- fixture cast, the mock implements only the surface the sender reads
    return new ReplySender(mock as unknown as Repliables, ROUTE);
}
