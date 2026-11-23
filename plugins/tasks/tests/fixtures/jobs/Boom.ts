import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

import type { TestHost } from '#tests/utils/host';

@RegisterTask()
export class Boom extends Task<void, TestHost> {
    public async execute(): Promise<void> {
        this.core.runs.push({ task: this.key, trigger: this.trigger, data: this.data });
        await Promise.reject(new Error('boom'));
    }

    public override async onError(error: Error): Promise<void> {
        this.core.runs.push({ task: 'onError', trigger: this.trigger, data: error.message });
        await Promise.reject(new Error('onError broke too'));
    }
}
