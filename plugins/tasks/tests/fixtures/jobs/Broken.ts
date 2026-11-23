import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

import type { TaskContext } from '#src/types/Tasks';

@RegisterTask()
export class Broken extends Task {
    public constructor(context: TaskContext<void>) {
        super(context);
        throw new Error('no');
    }

    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
