import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { scopeHashes } from '#src/commands/scopeHashes';
import { GLOBAL_ID } from '#src/commands/scopes';

const PING = { name: 'ping', description: 'Replies with Pong!' };
const CONFIG = { name: 'config', description: 'Config' };
const REPORT = { name: 'Report', type: ApplicationCommandType.User } as const;

describe('scopeHashes', () => {
    it('gives each scope the same hash whatever order its commands load in', async () => {
        const first = await scopeHashes(
            new Map([
                [GLOBAL_ID, [PING, REPORT]],
                ['111', [CONFIG, PING]]
            ])
        );
        const second = await scopeHashes(
            new Map([
                [GLOBAL_ID, [REPORT, PING]],
                ['111', [PING, CONFIG]]
            ])
        );

        expect(second).toEqual(first);
    });

    it('changes only the hash of the scope whose command changed', async () => {
        const before = await scopeHashes(
            new Map([
                [GLOBAL_ID, [PING]],
                ['111', [CONFIG]]
            ])
        );
        const after = await scopeHashes(
            new Map([
                [GLOBAL_ID, [PING]],
                ['111', [{ ...CONFIG, description: 'Change the settings' }]]
            ])
        );

        expect(after[GLOBAL_ID]).toBe(before[GLOBAL_ID]);
        expect(after['111']).not.toBe(before['111']);
    });
});
