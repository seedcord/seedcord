import { BaseReplySender } from '#reply/BaseReplySender';
import { replyFileInfo } from '#reply/responseReport';
import { DispatchContext } from '#src/dispatch/DispatchContext';
import { busWith } from '#tests/utils/busWith';

import type { SentFile } from '#reply/responseReport';
import type { Bus } from '#subscribers/Bus';
import type { ReplyFile } from '@seedcord/types';

// chalk styles the messages
export const stripAnsi = (input: string): string => input.replaceAll(/\[[0-9;]*m/g, '');

export interface TestMessage {
    id: string;
}

const created: TestMessage = { id: 'm1' };

export class TestSender extends BaseReplySender<TestMessage> {
    // the flags each reply, followUp, and defer wrote in order
    public readonly written: number[] = [];
    // a test sets this to delay a write or make it reject. every writer awaits it first
    public beforeWrite: () => Promise<void> = () => Promise.resolve();

    public constructor(
        bus: Bus = busWith(),
        isEphemeralByDefault = true,
        dispatch: DispatchContext = new DispatchContext('slash', 'ping')
    ) {
        super({ bus, dispatch, interactionId: 'i1' }, isEphemeralByDefault);
    }

    protected async writeReply(_response: unknown, flags: number): Promise<TestMessage> {
        await this.beforeWrite();
        this.written.push(flags);
        return created;
    }
    protected async writeDefer(flags: number): Promise<void> {
        await this.beforeWrite();
        this.written.push(flags);
    }
    protected async writeDeferUpdate(): Promise<void> {
        await this.beforeWrite();
    }
    protected async writeUpdate(): Promise<TestMessage> {
        await this.beforeWrite();
        return created;
    }
    protected async writeFollowUp(_response: unknown, flags: number): Promise<TestMessage> {
        await this.beforeWrite();
        this.written.push(flags);
        return created;
    }
    protected async writeEditOriginal(): Promise<TestMessage> {
        await this.beforeWrite();
        return created;
    }
    protected async writeEditTarget(): Promise<TestMessage> {
        await this.beforeWrite();
        return created;
    }
    protected async writeDeleteOriginal(): Promise<void> {
        await this.beforeWrite();
    }
    protected async writeDeleteTarget(): Promise<void> {
        await this.beforeWrite();
    }
    protected async writeModal(): Promise<void> {
        await this.beforeWrite();
    }
    protected describeFile(file: ReplyFile): SentFile {
        return replyFileInfo(file);
    }
}
