import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const CLI_ROOT = join(import.meta.dirname, '../../..');

function dependencies(packageJson: string): Record<string, string> {
    // justified: both files are package manifests with a dependencies map
    return (JSON.parse(readFileSync(packageJson, 'utf8')) as { dependencies: Record<string, string> }).dependencies;
}

describe('cloudflare pins', () => {
    // another version can parse cloudflare.config.ts or .cloudflare/output differently from the plugin's copy
    it.each(['@cloudflare/config', '@cloudflare/build-output-utils'])(
        'pins %s to the version @cloudflare/vite-plugin depends on',
        (name) => {
            const plugin = dependencies(join(CLI_ROOT, 'node_modules/@cloudflare/vite-plugin/package.json'));

            expect(dependencies(join(CLI_ROOT, 'package.json'))[name]).toBe(plugin[name]);
        }
    );
});
