import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, it, expect } from 'vitest';

import { classifyGuildCommands } from '#commands/commands/classify';

const slash = (id: string, name: string) => ({ id, name, type: ApplicationCommandType.ChatInput }) as const;

describe('classifyGuildCommands', () => {
    it('flags a guild command whose name is also global as overlap, leaves guild-only commands alone', () => {
        const result = classifyGuildCommands(
            new Set(['ban']),
            [
                {
                    guildId: 'g1',
                    guildName: 'Alpha',
                    commands: [slash('1', 'ban'), slash('2', 'setup')]
                }
            ],
            false
        );

        expect(result).toEqual([{ ...slash('1', 'ban'), guildId: 'g1', guildName: 'Alpha', reason: 'overlap' }]);
    });

    it('flags every guild command as purge regardless of global overlap', () => {
        const result = classifyGuildCommands(
            new Set(['ban']),
            [
                {
                    guildId: 'g1',
                    guildName: 'Alpha',
                    commands: [slash('1', 'ban'), slash('2', 'setup')]
                }
            ],
            true
        );

        expect(result).toHaveLength(2);
        expect(result.map((flagged) => flagged.reason)).toEqual(['purge', 'purge']);
        expect(result.every((flagged) => flagged.guildName === 'Alpha')).toBe(true);
    });
});
