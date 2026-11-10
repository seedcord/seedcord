import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

@RegisterTask('* * * * *', { startAt: '2030-02-01T00:00:00', stopAt: '2030-01-01T00:00:00' })
export class Window extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
