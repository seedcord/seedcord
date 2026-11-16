import { ButtonBuilder, TextDisplayBuilder } from '@discordjs/builders';
import { ButtonHandler, ButtonRoute, CustomId, RowComponent, SlashHandler, SlashRoute } from '@seedcord/http';
import { ButtonStyle } from 'discord-api-types/v10';

import type { Core, DispatchMemberValues } from '@seedcord/http';

const DEFAULT_SIDES = 20;

export const RerollId = new CustomId('reroll').int('sides', 2, 100);

type Translate = DispatchMemberValues['t'];

class RerollRow extends RowComponent<'button'> {
    constructor(t: Translate, sides: number) {
        super('button');

        this.instance.addComponents(
            new ButtonBuilder()
                .setCustomId(RerollId.encode({ sides }))
                .setLabel(t('roll-again'))
                .setStyle(ButtonStyle.Secondary)
        );
    }
}

async function rollLine(
    t: Translate,
    core: Core,
    userId: string,
    actor: string,
    sides: number
): Promise<TextDisplayBuilder> {
    const value = 1 + Math.floor(Math.random() * sides);
    const { rolls } = core.db.services;
    await rolls.record(userId, sides, value);
    const count = await rolls.countFor(userId);
    return new TextDisplayBuilder().setContent(t('roll', { actor, value, sides, count }));
}

@SlashRoute('roll')
export class RollSlash extends SlashHandler<'roll'> {
    public async execute(): Promise<void> {
        const sides = this.options.getInteger('sides') ?? DEFAULT_SIDES;
        const line = await rollLine(this.t, this.core, this.user.id, this.dispatch.require('actor'), sides);

        await this.reply({ components: [line, new RerollRow(this.t, sides).component] });
    }
}

@ButtonRoute(RerollId)
export class RerollButton extends ButtonHandler<[typeof RerollId]> {
    public async execute(): Promise<void> {
        const { sides } = this.params;
        const line = await rollLine(this.t, this.core, this.user.id, this.dispatch.require('actor'), sides);

        await this.update({ components: [line, new RerollRow(this.t, sides).component] });
    }
}
