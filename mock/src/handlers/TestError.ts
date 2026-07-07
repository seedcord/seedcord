import { SlashHandler, SlashRoute } from '@seedcord/gateway';

@SlashRoute('throw')
export class TestError extends SlashHandler<'throw'> {
    async execute(): Promise<void> {
        await Promise.resolve();
        throw new Error('Test error');
    }
}
