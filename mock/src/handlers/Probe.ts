import { MessageFlags } from 'discord.js';
import { Catchable, SlashRoute, SlashHandler } from 'seedcord';

@SlashRoute('probe')
export class Probe extends SlashHandler<'probe'> {
    @Catchable()
    public async execute(): Promise<void> {
        const query = this.options.getString('query'); // string, required so never null
        const count = this.options.getInteger('count'); // number | null
        const category = this.options.getString('category'); // 'books' | 'films' | null

        await this.event.reply({
            content: `Searched ${query} (count ${count ?? 'all'}, category ${category ?? 'any'}).`,
            flags: MessageFlags.Ephemeral
        });
    }
}
