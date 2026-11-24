import ts from 'typescript';
import { describe, expect, it } from 'vite-plus/test';

import { renderAugmentation } from '#commands/codegen/renderAugmentation';

import type { PluginTypeTable } from '#commands/codegen/renderAugmentation';

const TARGET = `
export interface Core {}
export interface SlashRegistry {}
export interface UserContextMenuRegistry {}
export interface MessageContextMenuRegistry {}
export interface EmojiMap {}
export interface PluginTypes {}
export type AttachedPlugin<T> = T;
`;

const BOT = `
declare class Picker<T extends string> {
    codegen(): Promise<{ values: Record<string, T> }>;
}
declare const bot: {
    cron: { codegen(): Promise<{ ready: true }> };
    first: Picker<'a'>;
    second: Picker<'b'>;
};
export default bot;
`;

// the bot's type comes from a callback that reads a row, like a plugin option that reads another plugin
const BOT_READING_A_ROW = `
import type { PluginTypes } from './target';
declare class Cron {
    codegen(): Promise<{ ready: boolean }>;
}
declare const rows: PluginTypes;
declare function attach<Result>(read: () => Promise<Result>): { cron: Cron; result: Result };
const bot = attach(async () => rows.cron.ready);
export default bot;
`;

function errorCodes(types: PluginTypeTable, bot = BOT): number[] {
    const generated = renderAugmentation(
        { slash: {}, userContextMenus: {}, messageContextMenus: {}, emojis: {} },
        './target',
        {
            specifier: './bot',
            keys: types
                .values()
                .flatMap((parts) => parts.map(({ key }) => key))
                .toArray(),
            types,
            members: []
        }
    );
    const files = new Map([
        ['/target.ts', TARGET],
        ['/bot.ts', bot],
        ['/seedcord-gen.ts', generated]
    ]);
    const options = {
        strict: true,
        // nothing reads the check rows, and a bot with this on still has to compile
        noUnusedLocals: true,
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

    // createProgram skips a module that only an augmentation reaches unless it's a root
    const program = ts.createProgram([...files.keys()], options, host);
    return ts.getPreEmitDiagnostics(program).map(({ code }) => code);
}

describe('renderAugmentation Fits rows', () => {
    it("compiles a row that fits its plugin's codegen() and rejects one that doesn't", () => {
        expect(errorCodes(new Map([['cron', [{ key: 'cron', type: '{ ready: true }' }]]]))).toEqual([]);
        // 2344: the row doesn't satisfy the constraint on Fits
        expect(errorCodes(new Map([['cron', [{ key: 'cron', type: "{ ready: 'no' }" }]]]))).toEqual([2344]);
    });

    it("compiles a bot whose own type reads a plugin's row", () => {
        const types: PluginTypeTable = new Map([['cron', [{ key: 'cron', type: '{ ready: true }' }]]]);

        expect(errorCodes(types, BOT_READING_A_ROW)).toEqual([]);
    });

    it('checks each attachment of a generic plugin against its own type argument', () => {
        const picks = (second: string): PluginTypeTable =>
            new Map([
                [
                    'picker',
                    [
                        { key: 'first', type: "{ values: { x: 'a' } }" },
                        { key: 'second', type: second }
                    ]
                ]
            ]);

        expect(errorCodes(picks("{ values: { y: 'b' } }"))).toEqual([]);
        expect(errorCodes(picks("{ values: { y: 'a' } }"))).toEqual([2344]);
    });
});
