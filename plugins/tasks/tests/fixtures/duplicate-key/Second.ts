import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task } from '#src/Task';

@RegisterTask({ key: 'same' })
export class Second extends Task {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
