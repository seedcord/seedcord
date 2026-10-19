import { mkdirSync, mkdtempDisposableSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it, onTestFinished } from 'vitest';

import { openProjectWithSteps } from '#core/config/openProjectWithSteps';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { ShellMode } from '#core/viteMode';
import { configWithGreetingPlugin, GREETING, GREETING_PROBE } from '#tests/greetingPlugin';

const SERVER_FIELDS = "root: './src', instance: './bot.ts', build: { start: './index.ts' }";
const STARTED = 'seedcordTestPluginStarted';

type OpenSteps = Parameters<typeof openProjectWithSteps>[0];
type OpenStep = Parameters<OpenSteps['step']>[0];

interface RecordedSteps extends OpenSteps {
    readonly labels: OpenStep[];
}

function recordingSteps(): RecordedSteps {
    const labels: OpenStep[] = [];
    return {
        labels,
        step: (label, task) => {
            labels.push(label);
            return task();
        },
        detail: () => undefined
    };
}

function projectWithConfig(source: string): string {
    const temp = mkdtempDisposableSync(join(tmpdir(), 'seedcord-open-'));
    onTestFinished(() => temp.remove());
    // the loader resolves against the real path of a mac temp dir
    const projectDir = realpathSync(temp.path);
    mkdirSync(join(projectDir, 'src'));
    writeFileSync(join(projectDir, 'seedcord.config.ts'), source);
    writeFileSync(join(projectDir, 'src/probe.ts'), GREETING_PROBE);
    return projectDir;
}

const loader = new ProjectLoader(openModuleLoader, new ShellMode());

describe('openProjectWithSteps', () => {
    it('opens the project inside read config when the config has no vitePlugins', async () => {
        const projectDir = projectWithConfig(`export default { ${SERVER_FIELDS} };\n`);
        const steps = recordingSteps();

        await using _project = await openProjectWithSteps(steps, loader, { projectDir });

        expect(steps.labels).toEqual(['read config']);
    });

    it('starts the vitePlugins in a load plugins step of their own', async () => {
        const projectDir = projectWithConfig(configWithGreetingPlugin(SERVER_FIELDS));
        const steps = recordingSteps();

        await using project = await openProjectWithSteps(steps, loader, { projectDir });
        const probe = await project.modules.importModule<{ default: string }>(join(projectDir, 'src/probe.ts'));

        expect(steps.labels).toEqual(['read config', 'load plugins']);
        expect(probe.default).toBe(GREETING);
    });

    it('runs the check before any plugin starts', async () => {
        const projectDir = projectWithConfig(
            `export default { ${SERVER_FIELDS}, vitePlugins: () => [{ name: 'marks-start', config: () => { globalThis.${STARTED} = true; } }] };\n`
        );
        onTestFinished(() => {
            Reflect.deleteProperty(globalThis, STARTED);
        });
        const steps = recordingSteps();
        const failedCheck = new Error('entry missing');

        const opening = openProjectWithSteps(steps, loader, {
            projectDir,
            check: () => {
                throw failedCheck;
            }
        });

        await expect(opening).rejects.toBe(failedCheck);
        expect(steps.labels).toEqual(['read config']);
        expect(Reflect.get(globalThis, STARTED)).toBeUndefined();
    });

    it('fails the load plugins step when a plugin throws as Vite starts', async () => {
        const projectDir = projectWithConfig(
            `export default { ${SERVER_FIELDS}, vitePlugins: () => [{ name: 'breaks-on-start', config: () => { throw new Error('bad option'); } }] };\n`
        );
        const steps = recordingSteps();

        const caught: unknown = await openProjectWithSteps(steps, loader, { projectDir }).catch(
            (error: unknown) => error
        );

        expect(steps.labels).toEqual(['read config', 'load plugins']);
        assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
    });
});
