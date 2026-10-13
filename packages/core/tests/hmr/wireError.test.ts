import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { fromWireError, toWireError } from '#hmr/wireError';

import type { WireError } from '@seedcord/types/internal';

function overTheWire(error: unknown): Error {
    // eslint-disable-next-line unicorn/prefer-structured-clone -- vite's dev channel sends JSON between the worker and the CLI
    return fromWireError(JSON.parse(JSON.stringify(toWireError(error))) as WireError);
}

describe('wire errors', () => {
    it('keeps the name, message, stack, and code', () => {
        const sent = new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, ['DISCORD_BOT_TOKEN']);

        const received = overTheWire(sent);

        expect(received).toMatchObject({ name: sent.name, message: sent.message, stack: sent.stack });
        expect(received).toHaveProperty('code', SeedcordErrorCode.ConfigMissingEnv);
    });
});
