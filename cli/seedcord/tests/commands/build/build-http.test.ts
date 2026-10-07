import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentSteps } from '#tests/silentSteps';

import { hasBun, smokeBunBinary } from './bun';
import { smoke } from './smoke';

import type { BuildResult } from '#commands/build/BuildRunner';

const HTTP_BOT = join(import.meta.dirname, '../../fixtures/http-bot');

describe('seedcord build on an http bot', () => {
    let output = '';
    let result: BuildResult;

    beforeAll(async () => {
        result = await BuildRunner.create(silentSteps).run(HTTP_BOT);
        output = await smoke('http', process.execPath, [join(HTTP_BOT, 'dist/index.mjs')]);
    }, 120_000);

    it('reports what it bundled for the summary', () => {
        expect(result.bundle).toEqual({
            modules: 7,
            textFiles: 4,
            bytes: expect.any(Number) as number,
            entry: join(HTTP_BOT, 'dist/index.mjs')
        });
        expect(result.bundle.bytes).toBeGreaterThan(0);
    });

    it('loads its handlers and text files and answers an unsigned request', () => {
        expect(output).toContain('fixture:text hello from the text table');
        expect(output).toContain('fixture:text hello from the markdown twin');
    });

    it('points import.meta.filename at the built file when a text file shares its name', () => {
        const filename = /fixture:filename (\S+)/.exec(output)?.[1] ?? '';

        expect(readFileSync(filename, 'utf8')).toContain('fixture:filename');
    });

    it('resolves tsconfig path aliases in bot.ts and in handlers', () => {
        expect(output).toContain('fixture:bot-alias-loaded');
        expect(output).toContain('fixture:handlers-loaded');
    });

    it('loads a .js handler the way dev does', () => {
        expect(output).toContain('fixture:js-handler-loaded');
    });

    it('leaves import.meta inside a string as written', () => {
        expect(output).toContain('fixture:literal import.meta.dirname stays text');
    });

    it('bundles a source folder named logs', () => {
        expect(output).toContain('fixture:text a source folder named logs');
    });

    it.skipIf(!hasBun())(
        'still loads its files as a bun binary moved away from dist',
        async () => {
            const binaryOutput = await smokeBunBinary('http', HTTP_BOT);

            expect(binaryOutput).toContain('fixture:text hello from the text table');
            expect(binaryOutput).toMatch(/fixture:filename \S+\/handlers\/Echo\.js\n/);
            expect(binaryOutput).toMatch(/fixture:url file:\/\/\S+\/handlers\/Echo\.js\n/);
        },
        120_000
    );
});
