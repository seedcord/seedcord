import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { renderAugmentation } from '#commands/codegen/renderAugmentation';

const TARGET = `
export interface Core {}
export interface SlashRegistry {}
export interface UserContextMenuRegistry {}
export interface MessageContextMenuRegistry {}
export interface EmojiMap {}
export interface PluginTypes {}
`;

const BOT = `
declare const bot: { cron: { codegen(): Promise<{ ready: true }> } };
export default bot;
`;

function errorCodes(row: string): number[] {
    const generated = renderAugmentation(
        { slash: {}, userContextMenus: {}, messageContextMenus: {}, emojis: {} },
        './target',
        { specifier: './bot', keys: ['cron'], types: new Map([['cron', { key: 'cron', type: row }]]) }
    );
    const files = new Map([
        ['/target.ts', TARGET],
        ['/bot.ts', BOT],
        ['/seedcord-gen.ts', generated]
    ]);
    const options = {
        strict: true,
        noEmit: true,
        lib: ['lib.es2022.d.ts'],
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        types: []
    };
    const host = ts.createCompilerHost(options);
    const readLib = host.getSourceFile.bind(host);
    host.getSourceFile = (name, language): ts.SourceFile | undefined => {
        const text = files.get(name);
        return text === undefined ? readLib(name, language) : ts.createSourceFile(name, text, language);
    };
    const libExists = host.fileExists.bind(host);
    host.fileExists = (name): boolean => files.has(name) || libExists(name);

    // a module that only an augmentation reaches stays out of the program unless it's a root
    const program = ts.createProgram([...files.keys()], options, host);
    return ts.getPreEmitDiagnostics(program).map(({ code }) => code);
}

describe('renderAugmentation Fits rows', () => {
    it("compiles a row that fits its plugin's codegen() and rejects one that doesn't", () => {
        expect(errorCodes('{ ready: true }')).toEqual([]);
        // 2344: the row doesn't satisfy the constraint on Fits
        expect(errorCodes("{ ready: 'no' }")).toEqual([2344]);
    });
});
