import { ReflectionKind } from 'typedoc';

import type { DocIndexes, DocNode } from './types';

export type DirectoryEntity = 'classes' | 'interfaces' | 'enums' | 'types' | 'functions' | 'variables';

export type DirectorySnapshot = Record<DirectoryEntity, string[]>;

const ENTITY_KIND_MAP: Record<DirectoryEntity, ReflectionKind[]> = {
    classes: [ReflectionKind.Class],
    interfaces: [ReflectionKind.Interface],
    enums: [ReflectionKind.Enum],
    types: [ReflectionKind.TypeAlias],
    functions: [ReflectionKind.Function],
    variables: [ReflectionKind.Variable]
};

export class PackageDirectory {
    private readonly maps: Record<DirectoryEntity, Map<string, DocNode>>;

    private constructor(maps: Record<DirectoryEntity, Map<string, DocNode>>) {
        this.maps = maps;
    }

    static fromIndexes(indexes: DocIndexes): PackageDirectory {
        const maps = Object.entries(ENTITY_KIND_MAP).reduce(
            (acc, [entity, kinds]) => {
                acc[entity as DirectoryEntity] = PackageDirectory.collect(indexes, kinds);
                return acc;
            },
            {} as Record<DirectoryEntity, Map<string, DocNode>>
        );

        return new PackageDirectory(maps);
    }

    /**
     * Retrieve the doc node for a given entity by its slug key.
     */
    get(entity: DirectoryEntity, slug: string): DocNode | undefined {
        return this.maps[entity].get(slug);
    }

    getMap(entity: DirectoryEntity): Map<string, DocNode> {
        return new Map(this.maps[entity]);
    }

    /**
     * List all doc nodes captured under the given entity kind.
     */
    list(entity: DirectoryEntity): DocNode[] {
        return Array.from(this.maps[entity].values());
    }

    /**
     * List the slug keys for every doc node captured under the given entity kind.
     */
    listNames(entity: DirectoryEntity): string[] {
        return Array.from(this.maps[entity].keys()).sort((a, b) => a.localeCompare(b));
    }

    entries(entity: DirectoryEntity): [string, DocNode][] {
        return Array.from(this.maps[entity].entries());
    }

    snapshot(): DirectorySnapshot {
        return {
            classes: this.listNames('classes'),
            interfaces: this.listNames('interfaces'),
            enums: this.listNames('enums'),
            types: this.listNames('types'),
            functions: this.listNames('functions'),
            variables: this.listNames('variables')
        };
    }

    toRecord(): Record<DirectoryEntity, Map<string, DocNode>> {
        return {
            classes: this.getMap('classes'),
            interfaces: this.getMap('interfaces'),
            enums: this.getMap('enums'),
            types: this.getMap('types'),
            functions: this.getMap('functions'),
            variables: this.getMap('variables')
        };
    }

    private static collect(indexes: DocIndexes, kinds: ReflectionKind[]): Map<string, DocNode> {
        const map = new Map<string, DocNode>();

        for (const kind of kinds) {
            const bucket = indexes.byKind.get(kind) ?? [];
            for (const node of bucket) {
                map.set(node.slug, node);
            }
        }

        return map;
    }
}
