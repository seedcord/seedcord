import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

// a plain string skips the compile-time check, like a duration read from env
const every = String('soon');

@RegisterTask('* * * * * *', { every })
export class Vague extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
