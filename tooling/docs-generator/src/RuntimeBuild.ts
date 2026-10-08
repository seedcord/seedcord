// docs-engine bundles this entry into the docs site. keep it free of imports

// a class the `workerd` build of @seedcord/http declares under a default-build name, like the edge
// `Seedcord`, gets every key, slug and label from here
export class RuntimeBuild {
    static readonly default = new RuntimeBuild(undefined);

    constructor(readonly condition: string | undefined) {}

    // `Seedcord.fetch` becomes `Seedcord@workerd.fetch`
    withCondition(qualifiedName: string): string {
        return qualifiedName.replace(/^[^.]+/, (owner) => this.owner(owner));
    }

    // a member name like `[Symbol.iterator]` holds a dot
    slugPath(path: readonly string[]): string[] {
        return path.map((segment, index) => (index === 0 ? this.owner(segment) : segment));
    }

    // the condition goes last. a canonical reference already uses `!`, `.` and `:`
    key(canonicalKey: string): string {
        return this.condition ? `${canonicalKey}@${this.condition}` : canonicalKey;
    }

    // `Seedcord.attach` reads `Seedcord (workerd).attach`
    label(qualifiedName: string): string {
        return this.condition
            ? qualifiedName.replace(/^[^.]+/, (owner) => `${owner} (${this.condition})`)
            : qualifiedName;
    }

    private owner(name: string): string {
        return this.condition ? `${name}@${this.condition}` : name;
    }
}
