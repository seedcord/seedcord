export const typedDxCommand = `import { RegisterCommand, BuilderComponent } from 'seedcord';

@RegisterCommand('global')
export class SearchCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('search')
            .setDescription('Search the catalog')
            .addStringOption((o) =>
                o
                    .setName('category')
                    .setDescription('What to look through')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Books', value: 'books' },
                        { name: 'Films', value: 'films' }
                    )
            );
    }
}`;

export const typedDxHandler = `import { SlashRoute, SlashHandler } from 'seedcord';

@SlashRoute('search')
export class SearchHandler extends SlashHandler<'search'> {
    public async execute(): Promise<void> {
        // generated accessor, no cast and no null check
        const category = this.options.getString('category');
        //    ^?  'books' | 'films'

        await this.event.reply(\`Searching \${category}\`);
    }
}`;

export const resolvedCheck = `const category = getString('category');
//    ^?  'books' | 'films'

const valid: 'books' | 'films' = category; // OK
const wrong: 'audio' = category; // Error 2322`;

export const beforeRawDjs = `// build it, route to the subcommand, validate, all by hand
const data = new SlashCommandBuilder()
    .setName('library')
    .addSubcommand((s) => s.setName('search').addStringOption(/* ... */));

client.on(Events.InteractionCreate, async (i) => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName !== 'library') return;
    if (i.options.getSubcommand() !== 'search') return;

    const raw = i.options.getString('query');
    if (raw === null) throw new Error('required');
    const query = raw as 'fiction' | 'nonfiction'; // cast

    // ...manual guard and cooldown checks...
    await i.reply(\`Searching for \${query}\`);
});

// plus a REST register script, plus a switch per subcommand,
// plus a full process restart on every edit`;

export const afterSeedcord = `import { SlashRoute, SlashHandler, Gated, GuildOnly } from 'seedcord';

@Gated(GuildOnly())
@SlashRoute('library/search')
export class SearchHandler extends SlashHandler<'library/search'> {
    public async execute() {
        const query = this.options.getString('query');
        //    ^?  'fiction' | 'nonfiction'

        await this.event.reply(\`Searching for \${query}\`);
    }
}

// the subcommand route, registration and guards are handled.
// edit, save, hot reload runs and the gateway stays up.`;

export const codecSample = `import { ButtonBuilder } from 'discord.js';
import { CustomId } from 'seedcord';

// packed into the customId, so more state fits the 100 char cap
const Approve = new CustomId('approve')
    .snowflake('userId')
    .oneOf('action', ['approve', 'deny']);

// encode straight into the button's setCustomId
const button = new ButtonBuilder()
    .setCustomId(Approve.encode({ userId: '123', action: 'approve' }));

// in the button handler, params arrive decoded and typed
const { userId, action } = this.params;
//      userId -> string, action -> 'approve' | 'deny'`;

export const codegenOutput = `// seedcord-gen.d.ts  (generated)
declare module 'seedcord' {
    interface SlashOptionRegistry {
        search: {
            category: {
                kind: 'string';
                required: true;
                choices: ['books', 'films'];
            };
        };
    }
}`;

export const startTerminal = `$ pnpm create seedcord my-bot # scaffold a typed bot
$ cd my-bot
$ seedcord dev # tui | hot reload, the gateway stays alive

# bot online, every slash option fully typed`;

export const gatesSample = `import {
    Gated,
    and,
    or,
    GuildOnly,
    OwnerOnly,
    RequireRole,
    SlashRoute,
    SlashHandler
} from 'seedcord';

// and() passes when every arm does, or() when any one does
@Gated(or(OwnerOnly(), and(GuildOnly(), RequireRole(modRoleId))))
@SlashRoute('ban')
export class BanHandler extends SlashHandler<'ban'> {
    public async execute() {
        // an owner, or a mod inside a guild, gets through
    }
}`;
