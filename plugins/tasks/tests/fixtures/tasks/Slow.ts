import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

import type { TestHost } from '#tests/utils/host';

@RegisterTask('0 0 1 1 *', { key: 'slow', timezone: 'Europe/Sarajevo' })
export class Slow extends Task<void, TestHost> {
    public async execute(): Promise<void> {
        this.core.runs.push({ task: this.key, trigger: this.trigger, data: this.data });
        await this.core.gate;
    }

    public override async onOverrun(): Promise<void> {
        this.core.runs.push({ task: 'overrun', trigger: this.trigger, data: this.data });
        await this.core.overrunGate;
    }
}
