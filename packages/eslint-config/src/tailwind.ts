import { existsSync } from 'node:fs';
import path from 'node:path';

import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import tailwindCanonical from 'eslint-plugin-tailwind-canonical-classes';

import type { Linter } from 'eslint';

/**
 * Resolves a Tailwind entry CSS path for a package that does not ship its own `globals.css`.
 *
 * Many monorepo packages (shared UI primitives, utility libraries) consume tokens from a
 * sibling app's Tailwind setup rather than declaring their own `@import 'tailwindcss'` entry.
 * The canonical-class lint rules still need a CSS file to resolve the Tailwind scale against,
 * so we point them at a consuming app's `globals.css`.
 *
 * @param packageRoot - Absolute path to the consuming package's root (typically `import.meta.dirname`).
 * @param candidates - Relative paths to potential entry CSS files, tried in order. First existing wins.
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

/**
 * Parameters consumed by {@link tailwindBlock}.
 */
export interface TailwindBlockParams {
    /** File globs the block applies to (typically TS_FILES from constants). */
    files: string[];

    /**
     * Absolute path to the Tailwind entry CSS file. When `undefined`, the block is a no-op
     * (just declares `files` with no plugins or rules), keeping the lint surface clean
     * for packages with no Tailwind concept.
     */
    entryPoint: string | undefined;

    /** Utility function names whose string arguments get scanned. */
    calleeFunctions: string[];

    /** Tagged template literal names whose template content gets scanned. */
    taggedTemplates: string[];
}

/**
 * Builds the flat-config block that registers the canonical-class lint plugins.
 *
 * Registers:
 *   - `better-tailwindcss/enforce-canonical-classes` — shorthand combining, logical/physical pairs
 *     (e.g. `h-N w-N` → `size-N`). Supports tagged template literals via `tags`.
 *   - `tailwind-canonical-classes/tailwind-canonical-classes` — arbitrary-value scale normalization
 *     (e.g. `max-w-[180px]` → `max-w-45` when a scale match exists) + Tailwind v4 modifier
 *     position rewrites (`hover:!bg-x` → `hover:bg-x!`).
 *
 * Both rules are registered at `'warn'` so they autofix on save / via `lint:fix` without
 * blocking CI. A doubled-space artifact can appear when shorthand collapses; `prettier --write`
 * cleans it on the next format pass.
 */
export function tailwindBlock(params: TailwindBlockParams): Linter.Config {
    const block: Linter.Config = { files: [...params.files] };

    if (!params.entryPoint) {
        return block;
    }

    block.plugins = {
        'better-tailwindcss': betterTailwindcss,
        'tailwind-canonical-classes': tailwindCanonical
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
