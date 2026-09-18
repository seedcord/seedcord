// compile-only. tc is the assertion here, since an unused @ts-expect-error fails it.
import { Plugin } from '#src/plugin/Plugin';

import type { Pluggable } from '#node/Pluggable';

class Users extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public findByName(name: string): string {
        return name;
    }
}

class Tickets extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

declare const bot: Pluggable<'gateway', 'server'>;

function readsBothLeaves(): void {
    const grouped = bot.attach('services.users', Users).attach('services.tickets', Tickets);

    const name: string = grouped.services.users.findByName('ada');
    const tickets: Tickets = grouped.services.tickets;
    void name;
    void tickets;
}

function sameLeafInAnotherGroup(): void {
    bot.attach('services.users', Users).attach('admins.users', Users);
}

function rejectsBadKeys(): void {
    // @ts-expect-error a key takes at most one dot
    bot.attach('a.b.c', Users);

    // @ts-expect-error the group name is a channel the framework logs on
    bot.attach('commands.users', Users);

    // @ts-expect-error events is one of those channels
    bot.attach('events', Users);

    // @ts-expect-error the host already carries a shutdown member
    bot.attach('shutdown', Users);

    // @ts-expect-error an empty group
    bot.attach('.users', Users);

    // @ts-expect-error an empty leaf
    bot.attach('services.', Users);

    // @ts-expect-error every object already has toString
    bot.attach('toString', Users);

    // @ts-expect-error an empty key
    bot.attach('', Users);

    // @ts-expect-error applicationId is a member on the bot, so nothing nests under it
    bot.attach('applicationId.users', Users);
}

function rejectsCollisions(): void {
    const grouped = bot.attach('services.users', Users);
    // @ts-expect-error that leaf is already attached
    grouped.attach('services.users', Tickets);
    // @ts-expect-error services already holds a group
    grouped.attach('services', Tickets);

    const flat = bot.attach('db', Users);
    // @ts-expect-error db already holds a plugin, so nothing nests inside it
    flat.attach('db.pool', Tickets);
    // @ts-expect-error db is already attached
    flat.attach('db', Tickets);
}

void readsBothLeaves;
void sameLeafInAnotherGroup;
void rejectsBadKeys;
void rejectsCollisions;
