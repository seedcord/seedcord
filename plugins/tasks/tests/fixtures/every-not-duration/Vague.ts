import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

// justified: a value from .env reaches this check through a cast
@RegisterTask('* * * * * *', { every: 'soon' as '90s' })
export class Vague extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
