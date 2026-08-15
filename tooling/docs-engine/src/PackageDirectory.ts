import { DocKind } from '#model/kinds';

import type { EntityTone } from '#src/tones';
import type { DocIndexes, DocNode } from '#src/types';

export type DirectoryEntity = 'classes' | 'interfaces' | 'enums' | 'types' | 'functions' | 'variables';

export type DirectorySnapshot = Record<DirectoryEntity, string[]>;

const ENTITY_KIND_MAP: Record<DirectoryEntity, number[]> = {
    classes: [DocKind.Class],
    interfaces: [DocKind.Interface],
    enums: [DocKind.Enum],
    types: [DocKind.TypeAlias],
    functions: [DocKind.Function],
    variables: [DocKind.Variable]
};

const ENTITY_TONE_MAP: Record<DirectoryEntity, EntityTone> = {
    classes: 'class',
    interfaces: 'interface',
    enums: 'enum',
    types: 'type',
    functions: 'function',
    variables: 'variable'
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

    get(entity: DirectoryEntity, slug: string): DocNode | undefined {
        return this.maps[entity].get(slug);
    }

    getMap(entity: DirectoryEntity): Map<string, DocNode> {
        return new Map(this.maps[entity]);
    }

    list(entity: DirectoryEntity): DocNode[] {
        return [...this.maps[entity].values()];
    }

    listNames(entity: DirectoryEntity): string[] {
        return [...this.maps[entity].keys()].sort((a, b) => a.localeCompare(b));
    }

    entries(entity: DirectoryEntity): [string, DocNode][] {
        return [...this.maps[entity].entries()];
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

    // Flat slug -> tone map of every top-level exported entity, the shape stored in the published
    // index.json so the lazy engine builds cross-package URLs without loading the package.
    toneMap(): Record<string, EntityTone> {
        const map: Record<string, EntityTone> = {};
        for (const [entity, tone] of Object.entries(ENTITY_TONE_MAP)) {
            for (const slug of this.maps[entity as DirectoryEntity].keys()) {
                map[slug] = tone;
            }
        }
        return map;
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

    private static collect(indexes: DocIndexes, kinds: number[]): Map<string, DocNode> {
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
