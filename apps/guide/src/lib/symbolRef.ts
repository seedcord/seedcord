const INSTALLED = /\/node_modules\/@seedcord\/([^/]+)\//;
// plugins/mongoose publishes as @seedcord/plugin-mongoose
const WORKSPACE = /\/(packages|plugins|tooling|cli)\/([^/]+)\//;

/** The reference site's folder for the package a declaration file belongs to. */
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

/** The reference-site target for a hovered symbol that a seedcord package declares. */
export function referenceFor(file: string, qualifiedName: string): SymbolReference | null {
    const pkg = packageOfDeclaration(file);
    if (!pkg) return null;

    const symbol = qualifiedName.replace(QUOTED_MODULE, '');

    return symbol ? { pkg, symbol } : null;
}
