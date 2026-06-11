import { Catchable, SlashHandler, SlashRoute } from 'seedcord';

@SlashRoute('throw')
export class TestError extends SlashHandler<'throw'> {
    @Catchable()
    async execute(): Promise<void> {
        await Promise.resolve();
        throw new Error('Test error');
    }
}
