import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vite-plus/test';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';
import { ShellMode } from '#src/core/ShellMode';

import { compilesBunBinaries, smokeBunBinary } from './bun';
import { smoke } from './smoke';

import type { BuildResult } from '#commands/build/BuildRunner';

const HTTP_BOT = join(import.meta.dirname, '../../fixtures/http-bot');

function builtFilesContaining(text: string): string[] {
    const dist = join(HTTP_BOT, 'dist');
    return readdirSync(dist, { recursive: true, encoding: 'utf8' })
        .map((file) => join(dist, file))
        .filter((file) => statSync(file).isFile() && readFileSync(file, 'utf8').includes(text));
}

describe('seedcord build on an http bot', () => {
    let output = '';
    let result: BuildResult;

    beforeAll(async () => {
        result = await BuildRunner.create(quietSteps, new ShellMode()).run(HTTP_BOT);
        output = await smoke('http', process.execPath, [join(HTTP_BOT, 'dist/index.mjs')]);
    }, 120_000);

    it('reports what it bundled for the summary', () => {
        expect(result.bundle).toEqual({
            modules: 9,
            listedFiles: 6,
            bytes: expect.any(Number) as number,
            entry: join(HTTP_BOT, 'dist/index.mjs')
        });
        expect(result.bundle.bytes).toBeGreaterThan(0);
    });

    it('loads its handlers and text files and answers an unsigned request', () => {
        expect(output).toContain('fixture:text hello from the text table');
        expect(output).toContain('fixture:text hello from the markdown twin');
    });

    it.each(['wordmark.webp', 'theme.css'])('reads %s from a listed folder byte for byte', (name) => {
        const source = readFileSync(join(HTTP_BOT, 'src/assets', name));

        expect(output).toContain(`fixture:bytes ${name} ${createHash('sha256').update(source).digest('hex')}`);
    });

    it('points import.meta.filename at the built file when a text file shares its name', () => {
        const filename = /fixture:filename (\S+)/.exec(output)?.[1] ?? '';

        expect(readFileSync(filename, 'utf8')).toContain('fixture:filename');
    });

    it('reports a module under a scanned folder by its built js path', () => {
        expect(output).toContain('fixture:module markers.js');
    });

    it('resolves tsconfig path aliases in bot.ts and in handlers', () => {
        expect(output).toContain('fixture:bot-alias-loaded');
        expect(output).toContain('fixture:handlers-loaded');
    });

    it('loads a .js handler the way dev does', () => {
        expect(output).toContain('fixture:js-handler-loaded');
    });

    it('loads .tsx and .mts handlers as code and builds them to .js files', () => {
        expect(output).toContain('fixture:mts-handler-loaded');
        expect(readFileSync(join(HTTP_BOT, 'dist/handlers/Dice.js'), 'utf8')).toContain('fixture:tsx-handler-loaded');
        expect(readFileSync(join(HTTP_BOT, 'dist/handlers/Coin.js'), 'utf8')).toContain('fixture:mts-handler-loaded');
    });

    it('leaves import.meta inside a string as written', () => {
        expect(output).toContain('fixture:literal import.meta.dirname stays text');
    });

    it('reads the .env files beside seedcord.config.ts', () => {
        expect(output).toContain('fixture:env beside the config');
    });

    it('bundles a source folder named logs', () => {
        expect(output).toContain('fixture:text a source folder named logs');
    });

    it('bundles a listed folder beside root into dist', () => {
        const beside = readFileSync(join(HTTP_BOT, 'dist/_virtual/files/shared/beside.txt.js'), 'utf8');

        expect(beside).toContain('hello from beside src');
        expect(output).toContain('fixture:text hello from beside src');
    });

    it('writes a listed text file as plain text, named by its path under the folder that holds the config', () => {
        const written = readdirSync(join(HTTP_BOT, 'dist'), { recursive: true, encoding: 'utf8' });
        const greeting = readFileSync(join(HTTP_BOT, 'dist/_virtual/files/src/locales/greeting.md.js'), 'utf8');

        expect(written.filter((path) => path.includes('"') || path.includes(HTTP_BOT.slice(1)))).toEqual([]);
        expect(greeting).toContain('hello from the markdown twin');
    });

    it.each([
        ['a folder outside files', 'fixture:unlisted'],
        ['a dot-folder inside a listed folder', 'fixture:skipped']
    ])('bundles no text from %s', (_, marker) => {
        expect(builtFilesContaining(marker)).toEqual([]);
    });

    it.skipIf(!compilesBunBinaries())(
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
