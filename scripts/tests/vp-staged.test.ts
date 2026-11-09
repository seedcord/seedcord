import path from 'node:path';

import { parseArgsStringToArgv } from 'string-argv';
import { describe, expect, it } from 'vite-plus/test';

import { runEslint } from '#src/vp-staged';

const REPO = path.resolve(import.meta.dirname, '../..');
const PACKAGE = path.join(REPO, 'packages/discord-component-embed');
const FILE = path.join(PACKAGE, 'src/check.ts');

// vp staged splits each command with string-argv and runs it without a shell
const argvOf = (commands: string[]): string[][] => commands.map((command) => parseArgsStringToArgv(command));

describe('vp staged commands', () => {
    it('runs eslint on a staged file from the folder of its nearest eslint config', () => {
        expect(argvOf(runEslint([FILE]))).toEqual([
            [
                'vp',
                '-C',
                PACKAGE,
                'exec',
                'eslint',
                '--no-warn-ignored',
                '--max-warnings=0',
                '--fix',
                '--cache',
                '--config',
                'eslint.config.ts',
                'src/check.ts'
            ]
        ]);
    });

    it('passes a file name holding a double quote as one argument', () => {
        const quoted = path.join(PACKAGE, 'src/say "hi".ts');

        expect(argvOf(runEslint([quoted]))[0]?.at(-1)).toBe('src/say "hi".ts');
    });

    it('passes a file name holding a single quote as one argument', () => {
        const quoted = path.join(PACKAGE, "src/don't.ts");

        expect(argvOf(runEslint([quoted]))[0]?.at(-1)).toBe("src/don't.ts");
    });

    it('throws for a file name holding both kinds of quote, which string-argv cannot carry', () => {
        const quoted = path.join(PACKAGE, `src/don't "say".ts`);

        expect(() => runEslint([quoted])).toThrow(
            `vp staged can't pass a path holding both ' and ", got src/don't "say".ts`
        );
    });
});
