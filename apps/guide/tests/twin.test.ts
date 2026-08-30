import { describe, expect, it } from 'vitest';

import { twinOf } from './twinPipeline';

describe('what an agent reads instead of the page', () => {
    it('drops the heading anchor a reader never sees', async () => {
        expect(await twinOf('## Reading options\n')).toBe('## Reading options\n');
    });

    it('turns a symbol link into a link to the reference site', async () => {
        const twin = await twinOf('Read <Ref pkg="core" symbol="Commands">`Commands`</Ref> first.\n');

        expect(twin).toContain('[`Commands`](https://docs.seedcord.org/packages/core/latest/commands)');
    });

    it('anchors a member on its owner page', async () => {
        const twin = await twinOf('<Ref pkg="core" symbol="Paginator.start">`start`</Ref>\n');

        expect(twin).toContain('/packages/core/latest/paginator#start)');
    });

    it('names the package alone when a ref carries no symbol', async () => {
        const twin = await twinOf('<Ref pkg="core" symbol="">core</Ref>\n');

        expect(twin).toContain('[core](https://docs.seedcord.org/packages/core/latest)');
    });

    it('writes a callout as a blockquote a reader of plain text can follow', async () => {
        const twin = await twinOf('<Callout type="warning">\n\nMind the cap.\n\n</Callout>\n');

        expect(twin).toBe('> **Warning**\n>\n> Mind the cap.\n');
    });

    it('names which transport a transport callout applies to', async () => {
        const twin = await twinOf('<Callout type="transport" only="gateway">\n\nOnly here.\n\n</Callout>\n');

        expect(twin).toContain('> **Gateway only**');
    });

    it('turns a shell block into the command it renders', async () => {
        expect(await twinOf('<Shell create="seedcord" />\n')).toBe('```sh\npnpm create seedcord\n```\n');
    });

    it('keeps the lines a shell block puts above the command', async () => {
        const twin = await twinOf('<Shell run="dev" before="cd my-bot" />\n');

        expect(twin).toBe('```sh\ncd my-bot\npnpm run dev\n```\n');
    });

    it('shows a fence the way the page shows it, with the cut applied', async () => {
        const source = '```ts twoslash\nimport { Ping } from "./Ping";\n// ---cut---\nnew Ping();\n```\n';

        expect(await twinOf(source)).toBe('```ts\nnew Ping();\n```\n');
    });

    it('keeps the title a fence carries', async () => {
        const source = '```ts title="src/bot.ts"\nconst a = 1;\n```\n';

        expect(await twinOf(source)).toBe('```ts title="src/bot.ts"\nconst a = 1;\n```\n');
    });
});
