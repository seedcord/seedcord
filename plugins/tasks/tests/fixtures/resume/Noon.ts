import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

import type { TestHost } from '#tests/utils/host';

@RegisterTask('0 0 12 * * *')
export class Noon extends Task<void, TestHost> {
    public async execute(): Promise<void> {
        this.core.runs.push({ task: this.key, trigger: this.trigger, data: this.data });
        await Promise.resolve();
    }
}
