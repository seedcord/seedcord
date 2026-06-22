import { describe, it, expect } from 'vitest';

import { classifyGuildCommands } from '@commands/commands/classify';

describe('classifyGuildCommands', () => {
    it('flags a guild command whose name is also global as overlap, leaves guild-only commands alone', () => {
        const result = classifyGuildCommands(
            new Set(['ban']),
            [
                {
                    guildId: 'g1',
                    guildName: 'Alpha',
                    commands: [
                        { id: '1', name: 'ban' },
                        { id: '2', name: 'setup' }
                    ]
                }
            ],
            false
        );

        expect(result).toEqual([{ guildId: 'g1', guildName: 'Alpha', id: '1', name: 'ban', reason: 'overlap' }]);
    });

    it('flags every guild command as purge regardless of global overlap', () => {
        const result = classifyGuildCommands(
            new Set(['ban']),
            [
                {
                    guildId: 'g1',
                    guildName: 'Alpha',
                    commands: [
                        { id: '1', name: 'ban' },
                        { id: '2', name: 'setup' }
                    ]
                }
            ],
            true
        );

        expect(result).toHaveLength(2);
        expect(result.map((flagged) => flagged.reason)).toEqual(['purge', 'purge']);
        expect(result.every((flagged) => flagged.guildName === 'Alpha')).toBe(true);
    });
});
