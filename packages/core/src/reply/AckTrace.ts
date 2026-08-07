import type { ReplyMethod } from './ackLegality';

// the first ack's stack, passed as the throw cause so a double-ack points to both lines
export class AckTrace extends Error {
    public constructor(method: ReplyMethod) {
        super(`${method}() acknowledged this interaction`);
        this.name = 'AckTrace';
    }
}
