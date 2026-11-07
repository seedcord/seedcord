import { setTimeout as sleep } from 'node:timers/promises';

import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

import type { TestHost } from '#tests/utils/host';

const LONGER_THAN_ANY_TEST_MS = 3_600_000;

@RegisterTask()
export class Abortable extends Task<void, TestHost> {
    public async execute(): Promise<void> {
        this.core.runs.push({ task: this.key, trigger: this.trigger, data: this.data });
        await sleep(LONGER_THAN_ANY_TEST_MS, undefined, { signal: this.signal });
    }

    public override async onError(): Promise<void> {
        await Promise.resolve();
    }
}
