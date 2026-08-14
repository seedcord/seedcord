import { existsSync } from 'node:fs';
import path from 'node:path';

import { requirePlugin } from './optionalPlugins';

import type { ESLint, Linter } from 'eslint';

/**
 * Resolves a Tailwind entry CSS path for a package that does not ship its own `globals.css`,
 * so the canonical-class rules can borrow a sibling app's entry.
 *
 * @param packageRoot - Absolute path to the consuming package's root (typically `import.meta.dirname`).
 * @param candidates - Relative paths tried in order, first existing wins.
 * @returns Absolute path to the first existing candidate, or `undefined` if none exist.
 */
export function resolveSharedTailwindEntry(packageRoot: string, candidates: string[]): string | undefined {
    for (const candidate of candidates) {
        const resolved = path.resolve(packageRoot, candidate);
        if (existsSync(resolved)) {
            return resolved;
        }
    }
    return undefined;
}

interface TailwindBlockParams {
    files: string[];
    // undefined makes the block a no-op for packages with no Tailwind surface
    entryPoint: string | undefined;
    calleeFunctions: string[];
    taggedTemplates: string[];
}

// both rules run at warn so they autofix without blocking CI. a doubled space can appear when
// shorthand collapses, but the next prettier pass cleans it
export function tailwindBlock(params: TailwindBlockParams): Linter.Config {
    const block: Linter.Config = { files: [...params.files] };

    if (!params.entryPoint) {
        return block;
    }

    block.plugins = {
        'better-tailwindcss': requirePlugin<ESLint.Plugin>('eslint-plugin-better-tailwindcss', 'tailwindEntryPoint'),
        'tailwind-canonical-classes': requirePlugin<ESLint.Plugin>(
            'eslint-plugin-tailwind-canonical-classes',
            'tailwindEntryPoint'
        )
    };
    block.settings = {
        'better-tailwindcss': { entryPoint: params.entryPoint }
    };
    block.rules = {
        'better-tailwindcss/enforce-canonical-classes': [
            'warn',
            { callees: params.calleeFunctions, tags: params.taggedTemplates }
        ],
        'tailwind-canonical-classes/tailwind-canonical-classes': [
            'warn',
            { cssPath: params.entryPoint, calleeFunctions: params.calleeFunctions }
        ]
    };

    return block;
}
