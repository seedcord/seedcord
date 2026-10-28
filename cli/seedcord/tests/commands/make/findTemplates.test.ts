import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findTemplates } from '#commands/make/findTemplates';
import { directDependencies } from '#core/modules/PackageManifest';
import { realPath } from '#core/project/realPath';
import { makeProject } from '#tests/commands/make/makeProject';
import { resolvedConfigOf } from '#tests/resolvedConfigOf';

const listed = (templates: { name: string; from: string }[]): string[] =>
    templates.map(({ name, from }) => `${from} ${name}`);

describe('findTemplates', () => {
    it("lists the bot's templates, then each installed dependency's that its package.json points at", async () => {
        const projectDir = makeProject({
            'package.json': JSON.stringify({
                dependencies: { 'seedcord-plugin-db': '1.0.0', 'plain-lib': '1.0.0', 'not-installed': '1.0.0' },
                devDependencies: { 'seedcord-plugin-dev': '1.0.0' }
            }),
            'templates/Slash/handlers/x.ts.hbs': '',
            'node_modules/seedcord-plugin-db/package.json': JSON.stringify({ seedcord: { templates: './tpl' } }),
            'node_modules/seedcord-plugin-db/tpl/Service/services/x.ts.hbs': '',
            'node_modules/seedcord-plugin-dev/package.json': JSON.stringify({ seedcord: { templates: 'templates' } }),
            'node_modules/seedcord-plugin-dev/templates/Probe/x.ts.hbs': '',
            'node_modules/plain-lib/package.json': JSON.stringify({ name: 'plain-lib' })
        });

        const templates = await findTemplates(resolvedConfigOf(projectDir), directDependencies(projectDir));

        expect(listed(templates)).toEqual([
            'templates/ Slash',
            'seedcord-plugin-db Service',
            'seedcord-plugin-dev Probe'
        ]);
    });

    it('reads the folder make.templates points at', async () => {
        const projectDir = makeProject({
            'package.json': '{}',
            'scaffolds/Button/x.ts.hbs': ''
        });
        const config = resolvedConfigOf(projectDir, {
            make: { templates: realPath(join(projectDir, 'scaffolds')), helpers: {} }
        });

        expect(listed(await findTemplates(config, new Map()))).toEqual(['scaffolds/ Button']);
    });
});
