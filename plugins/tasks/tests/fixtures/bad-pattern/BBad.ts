import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

// a plain string skips the compile-time check, like a pattern read from env
const pattern = String('61 * * * *');

@RegisterTask(pattern)
export class BBad extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
