import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

// a plain string skips the compile-time check, like a pattern read from env
const pattern = String('2030-01-01T00:00:00');

@RegisterTask(pattern)
export class Dated extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
