import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { InteractionDispatcher } from '#src/node/InteractionDispatcher';

const DUPLICATES_DIR = path.resolve(import.meta.dirname, './duplicates');

describe('http filesystem discovery, duplicate routes', () => {
    it('throws reporting the route id and both classes with their files', async () => {
        const dispatcher = new InteractionDispatcher(DUPLICATES_DIR);

        const error: unknown = await dispatcher.init().then(
            () => null,
            (caught: unknown) => caught
        );

        expect(error).toMatchObject({ code: SeedcordErrorCode.InteractionDuplicateRoute });
        // the same shape the edge builder renders
        const message = Error.isError(error) ? error.message : String(error);
        expect(message).toContain('slash:ping');
        expect(message).toContain('PingAgain.ts');
        expect(message).toContain('PingOriginal.ts');
    });
});
