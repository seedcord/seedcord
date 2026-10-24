import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it, onTestFinished } from 'vitest';

import { openModuleLoader } from '#core/modules/openModuleLoader';
import { realPath } from '#core/project/realPath';
import { cloudflareConfigSource, edgeFolder } from '#tests/edgeFolder';
import { vitePluginsOf } from '#tests/vitePluginsOf';

describe('environment setup before user imports', () => {
    it('drops removed Vite keys when the loader restarts', async () => {
        const { dir } = await edgeFolder('', ['envapt']);
        const entry = join(dir, 'probe.ts');
        await writeFile(
            entry,
            "import { Envapter } from 'envapt'; export const value = Envapter.get('VITE_REMOVED');\n"
        );
        await writeFile(join(dir, '.env'), 'VITE_REMOVED=first-session\n');
        {
            await using modules = await openModuleLoader(dir, { kind: 'server' }, 'development', 'config');
            expect(await modules.importModule(entry)).toMatchObject({ value: 'first-session' });
        }
        await writeFile(join(dir, '.env'), '');
        await using modules = await openModuleLoader(dir, { kind: 'server' }, 'development', 'config');

        expect(await modules.importModule(entry)).toMatchObject({ value: undefined });
    });

    it('reads Vite values and runtime files beside the config without changing cwd', async () => {
        const { dir } = await edgeFolder('', ['envapt']);
        await writeFile(join(dir, '.env'), 'VITE_GREETING=from-vite\nRUNTIME_GREETING=from-runtime\n');
        const entry = join(dir, 'config.ts');
        await writeFile(
            entry,
            `import { Envapter } from 'envapt';
export const vite = Envapter.get('VITE_GREETING');
export const direct = import.meta.env.VITE_GREETING;
export const runtime = Envapter.get('RUNTIME_GREETING');
`
        );

        await using modules = await openModuleLoader(dir, { kind: 'server' }, 'development', 'config');
        const values = await modules.importModule(entry);

        expect(values).toMatchObject({ vite: 'from-vite', direct: 'from-vite', runtime: 'from-runtime' });
    });

    it('adds Vite values to Worker bindings and scopes the CLI credential source', async () => {
        const { dir, cloudflareConfig } = await edgeFolder(
            cloudflareConfigSource(
                'DISCORD_BOT_TOKEN: bindings.secret(), VITE_GREETING: bindings.text("worker"), ENVIRONMENT: bindings.text("production")'
            ),
            ['cf', 'envapt']
        );
        await writeFile(join(dir, '.dev.vars'), 'DISCORD_BOT_TOKEN=local-token\n');
        await writeFile(join(dir, '.env'), 'VITE_GREETING=vite\n');
        const entry = join(dir, 'bot.ts');
        await writeFile(
            entry,
            `import { Envapter } from 'envapt';
export const greeting = Envapter.get('VITE_GREETING');
export const token = Envapter.get('DISCORD_BOT_TOKEN');
export const environment = Envapter.environment;
`
        );
        const previous = Envapter.source;
        onTestFinished(() => Envapter.useSource(previous));
        const custom = new PortableSource({ CUSTOM: 'preserved' });
        Envapter.useSource(custom);

        {
            await using modules = await openModuleLoader(
                dir,
                { kind: 'edge', cloudflareConfig: realPath(cloudflareConfig), viteRoot: realPath(dir) },
                'staging',
                { vitePlugins: vitePluginsOf() }
            );

            expect(await modules.importModule(entry)).toMatchObject({
                greeting: 'vite',
                token: 'local-token',
                environment: 'production'
            });
            expect(Envapter.get('DISCORD_BOT_TOKEN')).toBe('local-token');
        }

        expect(Envapter.source).toBe(custom);
        expect(Envapter.get('CUSTOM')).toBe('preserved');
    });

    it('restores the CLI source when an edge Vite plugin fails during startup', async () => {
        const { dir, cloudflareConfig } = await edgeFolder(cloudflareConfigSource(), ['cf', 'envapt']);
        const previous = Envapter.source;
        const baseDir = Envapter.baseDir;

        await expect(
            openModuleLoader(
                dir,
                { kind: 'edge', cloudflareConfig: realPath(cloudflareConfig), viteRoot: realPath(dir) },
                'development',
                {
                    vitePlugins: vitePluginsOf(() => [
                        {
                            name: 'broken',
                            configureServer() {
                                throw new Error('startup failed');
                            }
                        }
                    ])
                }
            )
        ).rejects.toThrow('startup failed');

        expect(Envapter.source).toBe(previous);
        expect(Envapter.baseDir).toBe(baseDir);
    });
});
