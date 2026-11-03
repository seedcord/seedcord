import { stripVTControlCharacters } from 'node:util';

import { NEXT_GUIDE } from '@seedcord/brand';
import { ASK_WAIT_STATUS, QUESTION_LENGTH, SearchUnavailable, SiteUnreachable } from '@seedcord/docs-search';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { ASK_STEPS, FOR_AGENT, FOR_PERSON } from '#commands/ask/AskPresenter';
import { AskRunner } from '#commands/ask/AskRunner';
import { StepPrinter } from '#core/output/StepPrinter';

import type { AskFormat } from '#commands/ask/AskPresenter';
import type { GuideResult } from '@seedcord/docs-search';

function hit(path: string, page: string, heading?: string): GuideResult {
    return {
        path,
        tab: 'Replying',
        page,
        ...(heading !== undefined && { heading }),
        url: NEXT_GUIDE.at(path),
        by: 'meaning'
    };
}

const THROWING = hit('/replying/throwing/', 'Throwing');
const NOTICE = hit('/replying/throwing/#writing-a-notice', 'Throwing', 'Writing a Notice');
const FAULTS = hit('/replying/faults/#reporting', 'Faults', 'Reporting');

async function ask(
    text: string,
    search: () => Promise<GuideResult[]>,
    format: AskFormat = FOR_PERSON
): Promise<string> {
    let written = '';
    const stdout = {
        isTTY: false,
        columns: 80,
        write: (chunk: string | Uint8Array) => {
            written += String(chunk);
            return true;
        }
    };
    const printer = new StepPrinter({ command: 'ask', labels: ASK_STEPS, verbose: false, stdout, stderr: stdout });

    await new AskRunner(NEXT_GUIDE, { search }).run(printer, format, text);
    return stripVTControlCharacters(written);
}

function failure(text: string, search: () => Promise<GuideResult[]>): Promise<unknown> {
    return ask(text, search).then(
        () => undefined,
        (error: unknown) => error
    );
}

describe('seedcord ask', () => {
    it('links each section to its anchor for a person, with one heading per page', async () => {
        const tabHomePage = hit('/replying/', 'Replying');
        const output = await ask('refuse', () => Promise.resolve([NOTICE, THROWING, FAULTS, tabHomePage]));

        expect(output.match(/Throwing \(Replying\)/g)).toHaveLength(1);
        expect(output).toContain(`\n  Replying\n    ${NEXT_GUIDE.url}/replying/\n`);
        expect(output).toContain(
            [
                'Throwing (Replying)',
                `    ${NEXT_GUIDE.url}/replying/throwing/`,
                '    Writing a Notice',
                `    ${NEXT_GUIDE.url}/replying/throwing/#writing-a-notice`
            ].join('\n')
        );
        expect(output).toContain(`Reporting\n    ${NEXT_GUIDE.url}/replying/faults/#reporting`);
    });

    it('links each page to its markdown once for an agent and lists the sections under it', async () => {
        const output = await ask('refuse', () => Promise.resolve([NOTICE, THROWING, FAULTS]), FOR_AGENT);

        expect(output).toContain(`Throwing (Replying): ${NEXT_GUIDE.url}/replying/throwing.md\n    - Writing a Notice`);
        expect(output).toContain(`Faults (Replying): ${NEXT_GUIDE.url}/replying/faults.md\n    - Reporting`);
        expect(output.match(/throwing\.md/g)).toHaveLength(1);
    });

    it('says which code it swapped and how to ask about one it only suspects', async () => {
        const output = await ask('[3116] and is 3102 a thing', () => Promise.resolve([NOTICE]));

        expect(output).toContain('3116 is CliDependencyMissing');
        expect(output).toContain(
            '3102 is also the error code CliConfigNotFound. If you meant that, run: seedcord ask "error 3102"'
        );
    });

    it('says when it shortened a long paste', async () => {
        const note = `Your text is over ${QUESTION_LENGTH.max} characters`;

        expect(await ask('word '.repeat(200), () => Promise.resolve([NOTICE]))).toContain(note);
        expect(await ask('short', () => Promise.resolve([NOTICE]))).not.toContain(note);
    });

    it('sends a person to the guide and an agent to llms.txt when nothing matches', async () => {
        const noResults = (): Promise<GuideResult[]> => Promise.resolve([]);
        const person = await ask('zzzzz', noResults);

        expect(person).toContain(`Try a full sentence, or read ${NEXT_GUIDE.url}\n`);
        expect(await ask('zzzzz', noResults, FOR_AGENT)).toContain(`or read ${NEXT_GUIDE.url}/llms.txt\n`);
    });

    it.each(['!!!', '    at file:///bot/src/bot.ts:3:1'])('rejects %s before it searches', async (text) => {
        const search = (): Promise<GuideResult[]> => Promise.reject(new Error('searched'));

        expect(await failure(text, search)).toMatchObject({ code: SeedcordErrorCode.CliAskBadQuestion });
    });

    it('turns a search limit into a wait, and any other failure into a failed search', async () => {
        const wait = new SearchUnavailable(ASK_WAIT_STATUS.tooManySearches, 60);
        const unreachable = new SiteUnreachable('/api/ask', new TypeError('fetch failed'));

        expect(await failure('refuse', () => Promise.reject(wait))).toMatchObject({
            code: SeedcordErrorCode.CliAskHasToWait,
            message: expect.stringContaining('Try again in 1 minute') as string
        });
        expect(await failure('refuse', () => Promise.reject(unreachable))).toMatchObject({
            code: SeedcordErrorCode.CliAskFailed,
            message: expect.stringContaining('never reached the server') as string
        });
    });
});
