// Imported by client components (FunctionBody); must not import the Node-bound `@seedcord/docs-engine`
// barrel, only the node-free `./Slugger` module, or `next build` breaks on a `node:module` import.
import { slugifySegment } from '#src/Slugger';

// Constructors already end in `/constructor`, so the trailing slug segment is the fragment with
// no kind check needed.
export function memberFragment(node: { slug: string }): string {
    const index = node.slug.lastIndexOf('/');
    return index === -1 ? node.slug : node.slug.slice(index + 1);
}

export function typeParamFragment(name: string): string {
    return `type-param-${slugifySegment(name)}`;
}

export function paramFragment(name: string): string {
    return `param-${slugifySegment(name)}`;
}

export function withOverload(base: string, overloadIndex: number, totalSignatures: number): string {
    return totalSignatures > 1 ? `${base}-overload-${overloadIndex + 1}` : base;
}
