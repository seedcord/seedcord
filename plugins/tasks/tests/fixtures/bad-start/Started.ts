import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

// a valid pattern, so only the date can fail
@RegisterTask('* * * * *', { startAt: '2030-13-45' })
export class Started extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
