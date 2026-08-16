import { Plugin } from '@seedcord/http';

// six shapes a dispose can throw
abstract class Disposer extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

export class PlainThrow extends Disposer {
    public override dispose(): Promise<void> {
        return Promise.reject(new Error('redis client never acknowledged QUIT'));
    }
}

export class ThrowWithCause extends Disposer {
    public override dispose(): Promise<void> {
        const cause = new Error('socket hang up');
        return Promise.reject(new Error('s3 upload queue failed to drain', { cause }));
    }
}

export class CodedThrow extends Disposer {
    public override dispose(): Promise<void> {
        // rejectOptions returns never
        this.rejectOptions('the migration lock was still held');
    }
}

export class StringThrow extends Disposer {
    public override dispose(): Promise<void> {
        // a dispose can throw anything
        // eslint-disable-next-line prefer-promise-reject-errors, @typescript-eslint/prefer-promise-reject-errors -- the point of this plugin
        return Promise.reject('worker pool refused to stop');
    }
}

export class NestedAggregateThrow extends Disposer {
    public override dispose(): Promise<void> {
        const shards = [new Error('shard 0 timed out'), new Error('shard 1 timed out')];
        return Promise.reject(new AggregateError(shards, 'two shards failed to close'));
    }
}

// long enough that the webhook's 1800-character budget has to divide it
const PADDING_FRAMES = 40;

export class LongStackThrow extends Disposer {
    public override dispose(): Promise<void> {
        const error = new Error('telemetry flush exceeded its window');
        const frame = '    at flush (/app/node_modules/telemetry/dist/index.mjs:118:15)\n';
        error.stack = `${error.stack ?? ''}\n${frame.repeat(PADDING_FRAMES)}`;
        return Promise.reject(error);
    }
}
