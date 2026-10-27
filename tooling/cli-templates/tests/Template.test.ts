import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { Template } from '#src/Template';
import { templateFolder } from '#tests/templateFolder';

describe('Template.readAll', () => {
    it('lists each top-level folder as a template and skips folders starting with _', async () => {
        await using folder = await templateFolder({
            'Slash/commands/{{pascal name}}.ts.hbs': '',
            'Button/handlers/{{pascal name}}.ts.hbs': '',
            '_partials/header.hbs': '',
            'notes.md': ''
        });

        const templates = await Template.readAll(folder.path, 'templates/');

        expect(templates.map(({ name, from }) => ({ name, from }))).toEqual([
            { name: 'Button', from: 'templates/' },
            { name: 'Slash', from: 'templates/' }
        ]);
    });

    it('reads a missing folder as lacking templates', async () => {
        await using folder = await templateFolder({});

        await expect(Template.readAll(join(folder.path, 'missing'), 'templates/')).resolves.toEqual([]);
    });
});
