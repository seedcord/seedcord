import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { DispatchContext } from '#src/dispatch/DispatchContext';
import { RepliableHandler } from '#src/handlers/RepliableHandler';

import type { CoreBase } from '#interfaces/CoreBase';
import type { BaseReplySender } from '#reply/BaseReplySender';

interface SentMessage {
    id: string;
}

type Sender = BaseReplySender<SentMessage, never>;

// justified: these probes only compare sender identity, no reply member runs
function fakeSender(tag: string): Sender {
    return { tag } as unknown as Sender;
}

const core = {} as CoreBase;

// buildSender runs from the base constructor, before this class's own field initializers
let built = 0;

class Probe extends RepliableHandler<string, CoreBase, SentMessage, never, Sender> {
    public constructor(dispatch: DispatchContext, sender?: Sender) {
        super('event', core, dispatch, sender);
    }

    protected buildSender(): Sender {
        built++;
        return fakeSender('built');
    }

    public execute(): Promise<void> {
        return Promise.resolve();
    }
}

beforeEach(() => {
    built = 0;
});

describe('RepliableHandler sender', () => {
    it('builds one when the caller passes none', () => {
        const handler = new Probe(new DispatchContext('slash:ping'));

        expect(handler.sender).toMatchObject({ tag: 'built' });
        expect(built).toBe(1);
    });

    it('takes the sender the caller passes', () => {
        const injected = fakeSender('injected');

        const handler = new Probe(new DispatchContext('slash:ping'), injected);

        expect(handler.sender).toBe(injected);
        expect(built).toBe(0);
    });
});
