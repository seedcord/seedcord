import { describe, expect, it } from 'vitest';

import { entityToMarkdown } from '@lib/docs/entityMarkdown';

import type { EntityModel } from '@lib/docs/types';

function para(plain: string): { plain: string; html: string } {
    return { plain, html: `<p>${plain}</p>` };
}

const classEntity = {
    kind: 'class',
    name: 'Seedcord',
    slug: 'seedcord',
    qualifiedName: 'Seedcord',
    displayPackage: 'seedcord',
    manifestPackage: '@seedcord/seedcord',
    version: '0.2.0',
    signature: { text: 'class Seedcord extends Container', html: null },
    summary: [para('The core orchestrator.')],
    summaryExamples: [],
    deprecationStatus: { isDeprecated: false },
    typeParameters: [],
    constructors: [],
    properties: [],
    methods: [
        {
            id: 'start',
            label: 'start',
            description: para('Boots the bot.'),
            sharedDocumentation: [],
            sharedExamples: [],
            signatures: [
                {
                    id: 'start-0',
                    anchor: 'start',
                    code: { text: 'start(): Promise<void>', html: null },
                    documentation: [],
                    examples: []
                }
            ]
        }
    ]
} as unknown as EntityModel;

const functionEntity = {
    kind: 'function',
    name: 'createConfig',
    slug: 'create-config',
    qualifiedName: 'createConfig',
    displayPackage: 'seedcord',
    manifestPackage: '@seedcord/seedcord',
    signature: { text: 'function createConfig(opts: Opts): Config', html: null },
    summary: [para('Builds a config.')],
    summaryExamples: [],
    deprecationStatus: { isDeprecated: false },
    signatures: [
        {
            id: 'createConfig-0',
            anchor: 'createConfig',
            code: { text: 'function createConfig(opts: Opts): Config', html: null },
            summary: [para('Builds a config from options.')],
            examples: [],
            parameters: [{ name: 'opts', optional: false, type: 'Opts', documentation: [para('The options.')] }],
            returnType: 'Config'
        }
    ]
} as unknown as EntityModel;

const enumEntity = {
    kind: 'enum',
    name: 'LogLevel',
    slug: 'log-level',
    qualifiedName: 'LogLevel',
    displayPackage: 'logger',
    manifestPackage: '@seedcord/logger',
    signature: { text: 'enum LogLevel', html: null },
    summary: [para('Severity levels.')],
    summaryExamples: [],
    deprecationStatus: { isDeprecated: false },
    members: [
        {
            id: 'debug',
            label: 'Debug',
            signature: { text: 'Debug = 0', html: null },
            summary: [para('Verbose output.')]
        }
    ]
} as unknown as EntityModel;

const deprecatedVariable = {
    kind: 'variable',
    name: 'OLD_FLAG',
    slug: 'old-flag',
    qualifiedName: 'OLD_FLAG',
    displayPackage: 'utils',
    manifestPackage: '@seedcord/utils',
    signature: { text: 'const OLD_FLAG: boolean', html: null },
    summary: [],
    summaryExamples: [],
    declaration: { text: 'const OLD_FLAG: boolean', html: null },
    deprecationStatus: { isDeprecated: true, deprecationMessage: [para('Use NEW_FLAG.')] }
} as unknown as EntityModel;

describe('entityToMarkdown', () => {
    it('renders a class with its name as the h1, kind+package meta, summary, signature, and member docs', () => {
        const md = entityToMarkdown(classEntity);
        expect(md).toContain('# Seedcord');
        expect(md).toMatch(/class.*seedcord/i);
        expect(md).toContain('The core orchestrator.');
        expect(md).toContain('class Seedcord extends Container');
        expect(md).toContain('start');
        expect(md).toContain('start(): Promise<void>');
        expect(md).toContain('Boots the bot.');
    });

    it('renders a function signature with its parameters and return type', () => {
        const md = entityToMarkdown(functionEntity);
        expect(md).toContain('# createConfig');
        expect(md).toContain('function createConfig(opts: Opts): Config');
        expect(md).toContain('opts');
        expect(md).toContain('The options.');
        expect(md).toContain('Config');
    });

    it('renders enum members with their values and summaries', () => {
        const md = entityToMarkdown(enumEntity);
        expect(md).toContain('# LogLevel');
        expect(md).toContain('Debug');
        expect(md).toContain('Verbose output.');
    });

    it('surfaces a deprecation notice and the declaration for a deprecated variable', () => {
        const md = entityToMarkdown(deprecatedVariable);
        expect(md.toLowerCase()).toContain('deprecated');
        expect(md).toContain('Use NEW_FLAG.');
        expect(md).toContain('const OLD_FLAG: boolean');
    });

    it('emits a fenced code block for the signature', () => {
        const md = entityToMarkdown(classEntity);
        expect(md).toContain('```ts');
    });
});
