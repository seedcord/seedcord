import { BaseReplySender } from '#reply/BaseReplySender';
import { DispatchContext } from '#src/dispatch/DispatchContext';
import { busWith } from '#tests/utils/busWith';

import type { Bus } from '#subscribers/Bus';

// chalk styles the messages
export const stripAnsi = (input: string): string => input.replaceAll(/\[[0-9;]*m/g, '');

export interface TestMessage {
    id: string;
}

export const created: TestMessage = { id: 'm1' };

export class TestSender extends BaseReplySender<TestMessage> {
    // the flags each reply, followUp, and defer wrote in order
    public readonly written: number[] = [];

    public constructor(
        bus: Bus = busWith(),
        isEphemeralByDefault = true,
        dispatch: DispatchContext = new DispatchContext('slash', 'ping')
    ) {
        super({ bus, dispatch, interactionId: 'i1' }, isEphemeralByDefault);
    }

    protected writeReply(_response: unknown, flags: number): Promise<TestMessage> {
        this.written.push(flags);
        return Promise.resolve(created);
    }
    protected writeDefer(flags: number): Promise<void> {
        this.written.push(flags);
        return Promise.resolve();
    }
    protected writeDeferUpdate(): Promise<void> {
        return Promise.resolve();
    }
    protected writeUpdate(): Promise<TestMessage> {
        return Promise.resolve(created);
    }
    protected writeFollowUp(_response: unknown, flags: number): Promise<TestMessage> {
        this.written.push(flags);
        return Promise.resolve(created);
    }
    protected writeEditOriginal(): Promise<TestMessage> {
        return Promise.resolve(created);
    }
    protected writeEditTarget(): Promise<TestMessage> {
        return Promise.resolve(created);
    }
    protected writeDeleteOriginal(): Promise<void> {
        return Promise.resolve();
    }
    protected writeDeleteTarget(): Promise<void> {
        return Promise.resolve();
    }
    protected writeModal(): Promise<void> {
        return Promise.resolve();
    }
}
