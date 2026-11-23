import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

@RegisterTask('* * * * *', { maxRuns: 0 })
export class Limited extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
