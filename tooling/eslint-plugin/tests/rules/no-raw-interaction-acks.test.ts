import dedent from 'dedent';

import rule from '#src/rules/no-raw-interaction-acks';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-raw-interaction-acks', rule, {
    valid: [
        // replying through the base-class member is allowed
        dedent`
            import { SlashHandler } from 'seedcord';
            export class Ban extends SlashHandler<'ban'> {
                async execute() {
                    await this.reply('banned');
                }
            }
        `,
        // a raw ack in a free helper is out of scope
        dedent`
            import { ChatInputCommandInteraction } from 'discord.js';
            export async function handle(event: ChatInputCommandInteraction) {
                await event.reply('hi');
            }
        `,
        // a non-handler class that happens to hold an interaction field
        dedent`
            import { ChatInputCommandInteraction } from 'discord.js';
            export class Wrapper {
                declare event: ChatInputCommandInteraction;
                async run() {
                    await this.event.reply('hi');
                }
            }
        `,
        // respond through the base-class member is the autocomplete path
        dedent`
            import { AutocompleteHandler } from 'seedcord';
            export class Search extends AutocompleteHandler<'search'> {
                async execute() {
                    await this.respond([]);
                }
            }
        `,
        // reading a non-ack property off the autocomplete interaction is untouched
        dedent`
            import { AutocompleteHandler } from 'seedcord';
            export class Search extends AutocompleteHandler<'search'> {
                async execute() {
                    const name = this.event.commandName;
                    await this.respond([{ name, value: name }]);
                }
            }
        `,
        // middleware replies through thrown stops, raw acks there are out of scope
        dedent`
            import { InteractionMiddleware } from 'seedcord';
            import { ChatInputCommandInteraction } from 'discord.js';
            export class Auth extends InteractionMiddleware<ChatInputCommandInteraction> {
                async execute() {
                    await this.event.reply('denied');
                }
            }
        `,
        // a non-ack method on the interaction is untouched
        dedent`
            import { SlashHandler } from 'seedcord';
            export class Ban extends SlashHandler<'ban'> {
                async execute() {
                    this.event.isCommand();
                }
            }
        `,
        // a nested non-handler class inside a handler method is its own receiver
        dedent`
            import { SlashHandler } from 'seedcord';
            import { ChatInputCommandInteraction } from 'discord.js';
            export class Ban extends SlashHandler<'ban'> {
                async execute() {
                    class Inner {
                        declare event: ChatInputCommandInteraction;
                        run() {
                            void this.event.reply('hi');
                        }
                    }
                    void Inner;
                }
            }
        `
    ],
    invalid: [
        {
            code: dedent`
                import { SlashHandler } from 'seedcord';
                export class Ban extends SlashHandler<'ban'> {
                    async execute() {
                        await this.event.reply('banned');
                    }
                }
            `,
            errors: [{ messageId: 'replyMember' }]
        },
        {
            code: dedent`
                import { SlashHandler } from 'seedcord';
                export class Ban extends SlashHandler<'ban'> {
                    async execute() {
                        await this.event.deferReply();
                    }
                }
            `,
            errors: [{ messageId: 'deferMember' }]
        },
        {
            code: dedent`
                import { SlashHandler } from 'seedcord';
                export class Ban extends SlashHandler<'ban'> {
                    async execute() {
                        await this.event.editReply('done');
                    }
                }
            `,
            errors: [{ messageId: 'editMember' }]
        },
        {
            code: dedent`
                import { SlashHandler } from 'seedcord';
                export class Ban extends SlashHandler<'ban'> {
                    async execute() {
                        await this.event.followUp('more');
                    }
                }
            `,
            errors: [{ messageId: 'followUpMember' }]
        },
        {
            code: dedent`
                import { ButtonHandler } from 'seedcord';
                export class Nav extends ButtonHandler<[]> {
                    async execute() {
                        await this.event.deferUpdate();
                    }
                }
            `,
            errors: [{ messageId: 'deferUpdateMember' }]
        },
        {
            code: dedent`
                import { ButtonHandler } from 'seedcord';
                export class Nav extends ButtonHandler<[]> {
                    async execute() {
                        await this.event.update('changed');
                    }
                }
            `,
            errors: [{ messageId: 'updateMember' }]
        },
        {
            code: dedent`
                import { SlashHandler } from 'seedcord';
                export class Ban extends SlashHandler<'ban'> {
                    async execute() {
                        await this.event.showModal({ customId: 'm', title: 't', components: [] });
                    }
                }
            `,
            errors: [{ messageId: 'showModalMember' }]
        },
        {
            code: dedent`
                import { SlashHandler } from 'seedcord';
                export class Ban extends SlashHandler<'ban'> {
                    async execute() {
                        await this.event.fetchReply();
                    }
                }
            `,
            errors: [{ messageId: 'fetchReply' }]
        },
        {
            code: dedent`
                import { SlashHandler } from 'seedcord';
                export class Ban extends SlashHandler<'ban'> {
                    async execute() {
                        await this.event.deleteReply();
                    }
                }
            `,
            errors: [{ messageId: 'deleteReply' }]
        },
        {
            code: dedent`
                import { UserContextMenuHandler } from 'seedcord';
                export class Info extends UserContextMenuHandler<'Info'> {
                    async execute() {
                        await this.event.reply('info');
                    }
                }
            `,
            errors: [{ messageId: 'replyMember' }]
        },
        {
            code: dedent`
                import { AutocompleteHandler } from 'seedcord';
                export class Search extends AutocompleteHandler<'search'> {
                    async execute() {
                        await this.event.respond([]);
                    }
                }
            `,
            errors: [{ messageId: 'respondMember' }]
        },
        {
            code: dedent`
                import { SelectMenuHandler } from 'seedcord';
                export class Pick extends SelectMenuHandler<[]> {
                    async execute() {
                        await this.event.reply('picked');
                    }
                }
            `,
            errors: [{ messageId: 'replyMember' }]
        },
        {
            // the const e = this.event alias form
            code: dedent`
                import { SlashHandler } from 'seedcord';
                export class Ban extends SlashHandler<'ban'> {
                    async execute() {
                        const e = this.event;
                        await e.reply('banned');
                    }
                }
            `,
            errors: [{ messageId: 'replyMember' }]
        },
        {
            // a subclass through a cross-file intermediate base still gates in
            code: dedent`
                import { IntermediateSlash } from './project-bases';
                export class Ban extends IntermediateSlash {
                    async execute() {
                        await this.event.reply('banned');
                    }
                }
            `,
            errors: [{ messageId: 'replyMember' }]
        },
        {
            // a subclass through a same-file intermediate abstract base
            code: dedent`
                import { SlashHandler } from 'seedcord';
                abstract class BaseSlash extends SlashHandler<'ban'> {}
                export class Ban extends BaseSlash {
                    async execute() {
                        await this.event.reply('banned');
                    }
                }
            `,
            errors: [{ messageId: 'replyMember' }]
        }
    ]
});
