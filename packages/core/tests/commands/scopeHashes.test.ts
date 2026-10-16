import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { scopeHashes } from '#src/commands/scopeHashes';

const PING = { name: 'ping', description: 'Replies with Pong!' };
const CONFIG = { name: 'config', description: 'Config' };
const REPORT = { name: 'Report', type: ApplicationCommandType.User } as const;

describe('scopeHashes', () => {
    it('gives each scope the same hash whatever order its commands load in', async () => {
        const first = await scopeHashes({ global: [PING, REPORT], guilds: new Map([['111', [CONFIG, PING]]]) });
        const second = await scopeHashes({ global: [REPORT, PING], guilds: new Map([['111', [PING, CONFIG]]]) });

        expect(second).toEqual(first);
    });

    it('changes only the hash of the scope whose command changed', async () => {
        const before = await scopeHashes({ global: [PING], guilds: new Map([['111', [CONFIG]]]) });
        const after = await scopeHashes({
            global: [PING],
            guilds: new Map([['111', [{ ...CONFIG, description: 'Change the settings' }]]])
        });

        expect(after.global).toBe(before.global);
        expect(after.guilds['111']).not.toBe(before.guilds['111']);
    });

    it('leaves global out when the scopes leave it out', async () => {
        const hashes = await scopeHashes({ guilds: new Map([['111', [CONFIG]]]) });

        expect(hashes.global).toBeUndefined();
    });
});
