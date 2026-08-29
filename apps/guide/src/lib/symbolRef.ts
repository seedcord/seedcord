const INSTALLED = /\/node_modules\/@seedcord\/([^/]+)\//;
// plugins/mongoose publishes as @seedcord/plugin-mongoose
const WORKSPACE = /\/(packages|plugins|tooling|cli)\/([^/]+)\//;

export function packageOfDeclaration(file: string): string | null {
    const installed = INSTALLED.exec(file);
    if (installed?.[1]) return installed[1];

    const workspace = WORKSPACE.exec(file);
    const [, root, dir] = workspace ?? [];
    if (!root || !dir) return null;

    return root === 'plugins' ? `plugin-${dir}` : dir;
}

export interface SymbolReference {
    pkg: string;
    symbol: string;
}

// the checker writes a module in front of a name it had to disambiguate
const QUOTED_MODULE = /^"[^"]*"\./;

// typescript names every anonymous declaration with a __ prefix, __type and __object among them
const SYNTHETIC_ROOT = /^__/;

export function referenceFor(file: string, qualifiedName: string): SymbolReference | null {
    const pkg = packageOfDeclaration(file);
    if (!pkg) return null;

    const symbol = qualifiedName.replace(QUOTED_MODULE, '');
    if (!symbol) return null;

    // a bus payload field arrives as __type.durationMs. the reference site has no page for it
    const [root] = symbol.split('.');
    if (root === undefined || SYNTHETIC_ROOT.test(root)) return null;

    return { pkg, symbol };
}
