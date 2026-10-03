import { DocKind } from '#model/kinds';
import { isEntityTone, type EntityTone } from '#src/tones';

import type { DocNode } from '#src/types';

export type DirectorySnapshot = Record<EntityTone, string[]>;

const TONE_KINDS = {
    class: DocKind.Class,
    interface: DocKind.Interface,
    type: DocKind.TypeAlias,
    function: DocKind.Function,
    enum: DocKind.Enum,
    variable: DocKind.Variable
} as const satisfies Record<EntityTone, number>;

function perTone<Value>(build: (tone: EntityTone) => Value): Record<EntityTone, Value> {
    return {
        class: build('class'),
        interface: build('interface'),
        type: build('type'),
        function: build('function'),
        enum: build('enum'),
        variable: build('variable')
    };
}

const TONES = Object.keys(TONE_KINDS).filter(isEntityTone);
const TONE_OF_KIND = new Map<number, EntityTone>(TONES.map((tone) => [TONE_KINDS[tone], tone]));

// the top-level symbols of one package, grouped by tone
export class PackageDirectory {
    private constructor(private readonly byTone: Record<EntityTone, Map<string, DocNode>>) {}

    static fromNodes(nodes: Iterable<DocNode>): PackageDirectory {
        const byTone = perTone(() => new Map<string, DocNode>());
        for (const node of nodes) {
            const tone = TONE_OF_KIND.get(node.kind);
            if (tone) byTone[tone].set(node.slug, node);
        }
        return new PackageDirectory(byTone);
    }

    entries(tone: EntityTone): [string, DocNode][] {
        return [...this.byTone[tone].entries()];
    }

    listNames(tone: EntityTone): string[] {
        return [...this.byTone[tone].keys()].sort((a, b) => a.localeCompare(b));
    }

    snapshot(): DirectorySnapshot {
        return perTone((tone) => this.listNames(tone));
    }

    // index.json stores this for an engine that has not loaded the package
    toneMap(): Record<string, EntityTone> {
        return Object.fromEntries(TONES.flatMap((tone) => [...this.byTone[tone].keys()].map((slug) => [slug, tone])));
    }
}
