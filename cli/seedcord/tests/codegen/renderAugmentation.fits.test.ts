import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { renderAugmentation } from '#commands/codegen/renderAugmentation';

import type { PluginTypeTable } from '#commands/codegen/renderAugmentation';

const TARGET = `
export interface Core {}
export interface SlashRegistry {}
export interface UserContextMenuRegistry {}
export interface MessageContextMenuRegistry {}
export interface EmojiMap {}
export interface PluginTypes {}
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

function errorCodes(types: PluginTypeTable): number[] {
    const generated = renderAugmentation(
        { slash: {}, userContextMenus: {}, messageContextMenus: {}, emojis: {} },
        './target',
        {
            specifier: './bot',
            keys: types
                .values()
                .flatMap((parts) => parts.map(({ key }) => key))
                .toArray(),
            types
        }
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
        expect(errorCodes(new Map([['cron', [{ key: 'cron', type: '{ ready: true }' }]]]))).toEqual([]);
        // 2344: the row doesn't satisfy the constraint on Fits
        expect(errorCodes(new Map([['cron', [{ key: 'cron', type: "{ ready: 'no' }" }]]]))).toEqual([2344]);
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
