import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

@RegisterTask('* * * * * *')
export class AGood extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
