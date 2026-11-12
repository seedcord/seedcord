import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

@RegisterTask('* * * * * *', { every: '1500ms' })
export class Fractional extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
