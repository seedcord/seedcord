import dedent from 'dedent';

import rule from '../../../src/rules/seedcord/no-raw-client-events';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-raw-client-events', rule, {
    valid: [
        // a non-Client emitter is not the framework's concern
        dedent`
            declare const emitter: { on(event: string, listener: () => void): void };
            emitter.on('messageCreate', () => {});
        `,
        // a same-named class that is not discord.js's Client
        dedent`
            class Client {
                on(event: string, listener: () => void): void {}
            }
            declare const client: Client;
            client.on('messageCreate', () => {});
        `,
        // a client meta event, left alone
        dedent`
            import { Client } from 'discord.js';
            declare const client: Client;
            client.on('error', () => {});
        `,
        // interactionCreate routes through the interaction dispatcher
        dedent`
            import { Client } from 'discord.js';
            declare const client: Client;
            client.on('interactionCreate', () => {});
        `,
        // a dynamic event name cannot be classified
        dedent`
            import { Client } from 'discord.js';
            declare const client: Client;
            declare const evt: string;
            client.on(evt, () => {});
        `,
        // a union containing a non-gateway event is skipped conservatively
        dedent`
            import { Client, Events } from 'discord.js';
            declare const client: Client;
            declare const evt: Events.MessageCreate | 'ready';
            client.on(evt, () => {});
        `,
        // a union with a dynamic member is skipped conservatively
        dedent`
            import { Client, Events } from 'discord.js';
            declare const client: Client;
            declare const evt: Events.MessageCreate | string;
            client.on(evt, () => {});
        `,
        // ready is a lifecycle event, not a gateway dispatch
        dedent`
            import { Client } from 'discord.js';
            declare const client: Client;
            client.on('ready', () => {});
        `,
        // warn is a meta event
        dedent`
            import { Client } from 'discord.js';
            declare const client: Client;
            client.once('warn', () => {});
        `,
        // a shard event
        dedent`
            import { Client } from 'discord.js';
            declare const client: Client;
            client.on('shardReady', () => {});
        `
    ],
    invalid: [
        {
            code: dedent`
                import { Client } from 'discord.js';
                declare const client: Client;
                client.on('messageCreate', () => {});
            `,
            errors: [{ messageId: 'rawEvent' }]
        },
        {
            code: dedent`
                import { Client } from 'discord.js';
                declare const client: Client;
                client.once('guildCreate', () => {});
            `,
            errors: [{ messageId: 'rawEvent' }]
        },
        {
            // the Events enum member resolves to the same string literal type
            code: dedent`
                import { Client, Events } from 'discord.js';
                declare const client: Client;
                client.on(Events.GuildMemberAdd, () => {});
            `,
            errors: [{ messageId: 'rawEvent' }]
        },
        {
            // a subclass of the discord.js Client is still the client
            code: dedent`
                import { Client } from 'discord.js';
                class MyBot extends Client {}
                declare const bot: MyBot;
                bot.on('messageCreate', () => {});
            `,
            errors: [{ messageId: 'rawEvent' }]
        },
        {
            // addListener is an EventEmitter alias for on
            code: dedent`
                import { Client } from 'discord.js';
                declare const client: Client;
                client.addListener('messageCreate', () => {});
            `,
            errors: [{ messageId: 'rawEvent' }]
        },
        {
            // prependListener is in REGISTER_METHODS
            code: dedent`
                import { Client } from 'discord.js';
                declare const client: Client;
                client.prependListener('messageCreate', () => {});
            `,
            errors: [{ messageId: 'rawEvent' }]
        },
        {
            // prependOnceListener is in REGISTER_METHODS
            code: dedent`
                import { Client } from 'discord.js';
                declare const client: Client;
                client.prependOnceListener('guildCreate', () => {});
            `,
            errors: [{ messageId: 'rawEvent' }]
        },
        {
            // a union of gateway event literals must be decomposed and flagged
            code: dedent`
                import { Client, Events } from 'discord.js';
                declare const client: Client;
                declare const evt: Events.MessageCreate | Events.GuildCreate;
                client.on(evt, () => {});
            `,
            errors: [{ messageId: 'rawEvent' }]
        }
    ]
});
