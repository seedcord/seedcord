// Docs anchor fragment grammar: members use their bare local slug segment; type-params and
// params carry a prefix, multi-signature members a `-overload-N` suffix.
// Imported by client components (FunctionBody), so it must not pull in the Node-dependent
// `@seedcord/docs-engine` barrel; `slugify` is duplicated from the engine's Slugger for that.

function slugify(segment: string): string {
    const normalized = segment
        .replace(/<.*?>/g, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
    return normalized || 'item';
}

// Constructors already end in `/constructor`, so the trailing slug segment is the fragment with
// no kind check needed.
export function memberFragment(node: { slug: string }): string {
    const index = node.slug.lastIndexOf('/');
    return index === -1 ? node.slug : node.slug.slice(index + 1);
}

export function typeParamFragment(name: string): string {
    return `type-param-${slugify(name)}`;
}

export function paramFragment(name: string): string {
    return `param-${slugify(name)}`;
}

export function withOverload(base: string, overloadIndex: number, totalSignatures: number): string {
    return totalSignatures > 1 ? `${base}-overload-${overloadIndex + 1}` : base;
}
