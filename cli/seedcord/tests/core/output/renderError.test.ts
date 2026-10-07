import { stripVTControlCharacters } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordAggregateError, SeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { renderError } from '#core/output/renderError';

function rendered(error: unknown, options: { verbose?: boolean; width?: number } = {}): string {
    return stripVTControlCharacters(renderError(error, { verbose: false, width: undefined, ...options }));
}

const relativeFolder = (folder: string): SeedcordError =>
    new SeedcordError(SeedcordErrorCode.CliBuildRelativeFolder, [folder]);

describe('renderError', () => {
    it('prints a seedcord error as its code and message, with every line indented', () => {
        const error = new SeedcordError(SeedcordErrorCode.CliBuildFailed, ['src/a.ts(1,1): error TS1']);

        expect(rendered(error)).toBe('  [3112] Type check failed:\n  src/a.ts(1,1): error TS1\n');
    });

    it('lists each problem in an aggregate as a bullet with its own code', () => {
        const error = new SeedcordAggregateError(
            SeedcordErrorCode.CliBuildFolderProblems,
            [relativeFolder('./handlers'), relativeFolder('./commands')],
            [2]
        );

        const [headline, ...bullets] = rendered(error).trimEnd().split('\n');

        expect(headline).toMatch(/^ {2}\[3133\] 2 folders/);
        expect(bullets).toHaveLength(2);
        expect(bullets[0]).toMatch(/^ {2}• \[3132\] \.\/handlers in the bot config/);
        expect(bullets[1]).toMatch(/^ {2}• \[3132\] \.\/commands in the bot config/);
    });

    it('wraps on words to the width and indents wrapped lines under the bullet text', () => {
        const error = new SeedcordAggregateError(
            SeedcordErrorCode.CliBuildFolderProblems,
            [relativeFolder('./handlers'), relativeFolder('./commands')],
            [2]
        );

        const lines = rendered(error, { width: 60 }).trimEnd().split('\n');
        const isBullet = (line: string): boolean => line.startsWith('  • ');
        const underBullets = lines.slice(lines.findIndex(isBullet)).filter((line) => !isBullet(line));

        expect(lines.every((line) => line.length <= 60)).toBe(true);
        expect(underBullets.length).toBeGreaterThan(0);
        expect(underBullets.every((line) => /^ {4}\S/.test(line))).toBe(true);
    });

    it('prints only the stack for an error from outside seedcord', () => {
        const error = new TypeError("Cannot read properties of undefined (reading 'path')");
        error.stack = `TypeError: ${error.message}\n    at file:///bot/src/bot.ts:14:31`;

        expect(rendered(error)).toBe(
            "  TypeError: Cannot read properties of undefined (reading 'path')\n      at file:///bot/src/bot.ts:14:31\n"
        );
    });

    it('prints a multi-line message once under --verbose', () => {
        const error = new SeedcordError(SeedcordErrorCode.CliBuildFailed, ['src/a.ts(1,1): error TS1']);

        const output = rendered(error, { verbose: true });

        expect(output.split('Type check failed:')).toHaveLength(2);
        expect(output.split('src/a.ts(1,1): error TS1')).toHaveLength(2);
    });

    it('adds the stack and the cause to a seedcord error under --verbose', () => {
        const cause = new Error('rolldown exploded');
        const error = new SeedcordError(SeedcordErrorCode.CliBundleFailed, ['rolldown exploded'], { cause });

        const output = rendered(error, { verbose: true });

        expect(output).toContain('at ');
        expect(output).toContain('cause: Error: rolldown exploded');
    });

    it('adds the cause of each problem in an aggregate under --verbose', () => {
        const constructorThrew = (name: string, reason: string): SeedcordError =>
            new SeedcordError(SeedcordErrorCode.CliCodegenCommandConstructorThrew, [name, 'src/x.ts', reason], {
                cause: new Error(reason)
            });
        const error = new SeedcordAggregateError(
            SeedcordErrorCode.CliCodegenCommandProblems,
            [constructorThrew('Ban', 'database not ready'), constructorThrew('Roll', 'bad option')],
            [2]
        );

        expect(rendered(error)).not.toContain('cause:');

        const verbose = rendered(error, { verbose: true });
        expect(verbose).toContain('cause: Error: database not ready');
        expect(verbose).toContain('cause: Error: bad option');
    });

    it('prints a thrown value that is not an error as text', () => {
        expect(rendered('the plugin threw a string')).toBe('  the plugin threw a string\n');
    });
});
