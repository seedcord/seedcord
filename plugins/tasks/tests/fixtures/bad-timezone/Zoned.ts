import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

// a plain string skips the compile-time check, like a timezone read from env
const timezone = String('Europe/Sarajvo');

@RegisterTask('* * * * *', { timezone })
export class Zoned extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
