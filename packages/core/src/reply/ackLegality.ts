import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

export type AckState = 'unacked' | 'deferred-reply' | 'deferred-update' | 'replied';

export type ReplyMethod = 'reply' | 'defer' | 'deferUpdate' | 'update' | 'followUp' | 'edit' | 'send' | 'showModal';

interface Illegal {
    // spliced into the message after "was called when"
    readonly reason: string;
    readonly alternative: string;
}

const showModalReason: Illegal = {
    reason: 'this interaction was already acknowledged',
    alternative: 'showModal() must be the initial response.'
};

function deferReason(what: string): Illegal {
    return {
        reason: `this interaction was already acknowledged with ${what}`,
        alternative: 'A deferral can only be the initial response.'
    };
}

// a missing entry means legal in that state
const ILLEGAL: Record<Exclude<ReplyMethod, 'send'>, Partial<Record<AckState, Illegal>>> = {
    reply: {
        'deferred-reply': {
            reason: 'this interaction was already deferred',
            alternative: 'Use edit() to fill the deferred reply or followUp() for a new message.'
        },
        'deferred-update': {
            reason: 'this interaction was already acknowledged with a deferred update',
            alternative: 'Use followUp() for a new message.'
        },
        replied: {
            reason: 'this interaction was already replied to',
            alternative: 'Use followUp() for a new message or edit() to rewrite the reply.'
        }
    },
    defer: {
        'deferred-reply': deferReason('a deferred reply'),
        'deferred-update': deferReason('a deferred update'),
        replied: deferReason('a reply')
    },
    deferUpdate: {
        'deferred-reply': deferReason('a deferred reply'),
        'deferred-update': deferReason('a deferred update'),
        replied: deferReason('a reply')
    },
    update: {
        'deferred-reply': {
            reason: 'this interaction was deferred as a reply',
            alternative: 'The placeholder is yours via edit(). update() rewrites a source message.'
        },
        replied: {
            reason: 'this interaction was already replied to',
            alternative: 'update() rewrites a source message. Use edit() or followUp() instead.'
        }
    },
    followUp: {
        unacked: {
            reason: 'this interaction has not been acknowledged yet',
            alternative: 'Ack first with reply() or defer().'
        }
    },
    edit: {
        unacked: {
            reason: 'nothing has been sent yet',
            alternative: 'Send with reply() or defer() first, then edit() rewrites it.'
        }
    },
    showModal: {
        'deferred-reply': showModalReason,
        'deferred-update': showModalReason,
        replied: showModalReason
    }
};

const SEND_TARGET: Record<AckState, 'reply' | 'edit' | 'followUp'> = {
    unacked: 'reply',
    'deferred-reply': 'edit',
    'deferred-update': 'followUp',
    replied: 'followUp'
};

/** Throws before any API call. */
export function checkAckLegality(method: ReplyMethod, state: AckState, routeId: string): void {
    if (method === 'send') return;
    const illegal = ILLEGAL[method][state];
    if (!illegal) return;
    throw new SeedcordError(SeedcordErrorCode.ReplyIllegalAckState, [
        method,
        illegal.reason,
        illegal.alternative,
        routeId
    ]);
}

export function sendTarget(state: AckState): 'reply' | 'edit' | 'followUp' {
    return SEND_TARGET[state];
}
