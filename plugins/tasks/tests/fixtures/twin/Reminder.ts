import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

import type { TestHost } from '#tests/utils/host';

// shares its key with jobs/Reminder. The plugin loads jobs/Reminder
@RegisterTask({ key: 'reminder' })
export class Reminder extends Task<{ text: string }, TestHost> {
    public async execute(): Promise<void> {
        this.core.runs.push({ task: 'twin', trigger: this.trigger, data: this.data });
        await Promise.resolve();
    }
}
