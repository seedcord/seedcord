import { buildSlashRoute } from '@seedcord/utils/internal';
import { SlashCommandBuilder, ApplicationCommandOptionType } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { AugmentationBuilder } from '#commands/codegen/AugmentationBuilder';

import { silentLogger } from '../silentLogger';

import type { SlashTables } from '#commands/codegen/AugmentationBuilder';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

// Independently re-derive the route key set from the same toJSON the generator reads, funneling every leaf
// through buildSlashRoute so the parity assertion fails if the generator's key format ever drifts from it.
function expectedRoutesFromJson(json: RESTPostAPIChatInputApplicationCommandsJSONBody): string[] {
    const options = json.options ?? [];
    const hasRouting = options.some(
        (option) =>
            option.type === ApplicationCommandOptionType.Subcommand ||
            option.type === ApplicationCommandOptionType.SubcommandGroup
    );
    if (!hasRouting) return [buildSlashRoute(json.name)];

    const routes: string[] = [];
    for (const option of options) {
        if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
            const subs = option.options ?? [];
            if (subs.length === 0) continue;
            for (const sub of subs) routes.push(buildSlashRoute(json.name, sub.name, option.name));
        } else if (option.type === ApplicationCommandOptionType.Subcommand) {
            routes.push(buildSlashRoute(json.name, option.name));
        }
    }
    return routes;
}

describe('route-key parity between AugmentationBuilder and buildSlashRoute', () => {
    it('flat command route key equals buildSlashRoute(cmd)', () => {
        const builder = new SlashCommandBuilder()
            .setName('ban')
            .setDescription('Ban a member')
            .addUserOption((o) => o.setName('target').setDescription('Who').setRequired(true));
        const json = builder.toJSON();

        const tables: SlashTables = new AugmentationBuilder(silentLogger).generate(
            [{ sourceFile: 'ban.ts', json }],
            {}
        ).slash;

        expect(new Set(Object.keys(tables))).toEqual(new Set(expectedRoutesFromJson(json)));
        expect(Object.keys(tables)).toEqual([buildSlashRoute('ban')]);
    });

    it('subcommand and group route keys equal buildSlashRoute over the same toJSON', () => {
        const builder = new SlashCommandBuilder()
            .setName('demo')
            .setDescription('subs')
            .addSubcommand((sc) =>
                sc
                    .setName('setup')
                    .setDescription('d')
                    .addChannelOption((o) => o.setName('channel').setDescription('d').setRequired(true))
            )
            .addSubcommandGroup((g) =>
                g
                    .setName('admin')
                    .setDescription('d')
                    .addSubcommand((sc) =>
                        sc
                            .setName('reset')
                            .setDescription('d')
                            .addUserOption((o) => o.setName('target').setDescription('d').setRequired(true))
                    )
            );
        const json = builder.toJSON();

        const tables: SlashTables = new AugmentationBuilder(silentLogger).generate(
            [{ sourceFile: 'demo.ts', json }],
            {}
        ).slash;

        expect(new Set(Object.keys(tables))).toEqual(new Set(expectedRoutesFromJson(json)));
    });

    it('empty subcommand group yields no route on either side', () => {
        const builder = new SlashCommandBuilder()
            .setName('admin')
            .setDescription('d')
            .addSubcommandGroup((g) => g.setName('empty').setDescription('gd'))
            .addSubcommand((sc) => sc.setName('ping').setDescription('pd'));
        const json = builder.toJSON();

        const tables: SlashTables = new AugmentationBuilder(silentLogger).generate(
            [{ sourceFile: 'admin.ts', json }],
            {}
        ).slash;

        expect(new Set(Object.keys(tables))).toEqual(new Set(expectedRoutesFromJson(json)));
        expect(Object.keys(tables)).toEqual([buildSlashRoute('admin', 'ping')]);
    });
});
