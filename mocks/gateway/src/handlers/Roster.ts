import { ArraySource, ButtonRoute, Paginator, SlashHandler, SlashRoute } from '@seedcord/gateway';

const MEMBERS = Array.from({ length: 37 }, (_, index) => `Member ${index + 1}`);

// the whole list is in memory, so ArraySource has a real total and renders all five controls
export const Roster = new Paginator({
    prefix: 'roster',
    source: new ArraySource(() => MEMBERS, { perPage: 8 }),
    renderItem: (name, index) => `**${index + 1}.** ${name}`,
    ephemeral: true
});

@ButtonRoute(Roster.cursor)
export class RosterNav extends Roster.Handler {}

@SlashRoute('roster')
export class RosterSlash extends SlashHandler<'roster'> {
    public async execute(): Promise<void> {
        await Roster.start(this);
    }
}
