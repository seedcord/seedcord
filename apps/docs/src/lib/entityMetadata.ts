import { tw } from '@seedcord/ui';
import { Braces, FunctionSquare, ListTree, Puzzle, SquareStack, Variable } from 'lucide-react';

const ENTITIES = {
    class: {
        label: 'Class',
        icon: SquareStack,
        styles: {
            heading: tw`text-(--tone-class-heading)`,
            item: tw`hover:border-(--tone-class-badge-border) hover:bg-(--tone-class-item-bg) focus-visible:outline-(--entity-class)`,
            badge: tw`border-(--tone-class-badge-border) bg-(--tone-class-badge-bg) text-(--entity-class)`,
            tag: tw`border-(--tone-class-badge-border) bg-(--tone-class-tag-bg) text-(--tone-class-tag-text)`,
            accent: tw`text-(--tone-class-heading)`
        }
    },
    interface: {
        label: 'Interface',
        icon: Puzzle,
        styles: {
            heading: tw`text-(--tone-interface-heading)`,
            item: tw`hover:border-(--tone-interface-badge-border) hover:bg-(--tone-interface-item-bg) focus-visible:outline-(--entity-interface)`,
            badge: tw`border-(--tone-interface-badge-border) bg-(--tone-interface-badge-bg) text-(--entity-interface)`,
            tag: tw`border-(--tone-interface-badge-border) bg-(--tone-interface-tag-bg) text-(--tone-interface-tag-text)`,
            accent: tw`text-(--tone-interface-heading)`
        }
    },
    type: {
        label: 'Type',
        icon: Braces,
        styles: {
            heading: tw`text-(--tone-type-heading)`,
            item: tw`hover:border-(--tone-type-badge-border) hover:bg-(--tone-type-item-bg) focus-visible:outline-(--entity-type)`,
            badge: tw`border-(--tone-type-badge-border) bg-(--tone-type-badge-bg) text-(--entity-type)`,
            tag: tw`border-(--tone-type-badge-border) bg-(--tone-type-tag-bg) text-(--tone-type-tag-text)`,
            accent: tw`text-(--tone-type-heading)`
        }
    },
    function: {
        label: 'Function',
        icon: FunctionSquare,
        styles: {
            heading: tw`text-(--tone-func-heading)`,
            item: tw`hover:border-(--tone-func-badge-border) hover:bg-(--tone-func-item-bg) focus-visible:outline-(--entity-function)`,
            badge: tw`border-(--tone-func-badge-border) bg-(--tone-func-badge-bg) text-(--entity-function)`,
            tag: tw`border-(--tone-func-badge-border) bg-(--tone-func-tag-bg) text-(--tone-func-tag-text)`,
            accent: tw`text-(--tone-func-heading)`
        }
    },
    enum: {
        label: 'Enum',
        icon: ListTree,
        styles: {
            heading: tw`text-(--tone-enum-heading)`,
            item: tw`hover:border-(--tone-enum-badge-border) hover:bg-(--tone-enum-item-bg) focus-visible:outline-(--entity-enum)`,
            badge: tw`border-(--tone-enum-badge-border) bg-(--tone-enum-badge-bg) text-(--entity-enum)`,
            tag: tw`border-(--tone-enum-badge-border) bg-(--tone-enum-tag-bg) text-(--tone-enum-tag-text)`,
            accent: tw`text-(--tone-enum-heading)`
        }
    },
    variable: {
        label: 'Variable',
        icon: Variable,
        styles: {
            heading: tw`text-(--tone-var-heading)`,
            item: tw`hover:border-(--tone-var-badge-border) hover:bg-(--tone-var-item-bg) focus-visible:outline-(--entity-variable)`,
            badge: tw`border-(--tone-var-badge-border) bg-(--tone-var-badge-bg) text-(--entity-variable)`,
            tag: tw`border-(--tone-var-badge-border) bg-(--tone-var-tag-bg) text-(--tone-var-tag-text)`,
            accent: tw`text-(--tone-var-heading)`
        }
    }
} as const;

export type EntityTone = keyof typeof ENTITIES;
export type EntityToneConfig = (typeof ENTITIES)[EntityTone];
export type EntityToneStyle = EntityToneConfig['styles'];

const TONE_DIRECTORY_MAP = {
    class: 'classes',
    interface: 'interfaces',
    type: 'types',
    function: 'functions',
    enum: 'enums',
    variable: 'variables'
} as const;

export type DirectoryEntityFrontend = (typeof TONE_DIRECTORY_MAP)[EntityTone];

export const toneToDirectory = (tone: EntityTone): DirectoryEntityFrontend => TONE_DIRECTORY_MAP[tone];

const TONE_SYNONYMS: Partial<Record<string, EntityTone>> = {
    typealias: 'type',
    alias: 'type',
    method: 'function',
    parameter: 'type',
    const: 'variable',
    constant: 'variable',
    property: 'variable',
    enumeration: 'enum'
};

const isEntityTone = (value: string): value is EntityTone => value in ENTITIES;

function buildToneCandidates(value: string): string[] {
    const candidates = new Set<string>([value]);

    if (value.endsWith('s')) {
        const withoutS = value.slice(0, -1);
        if (withoutS) {
            candidates.add(withoutS);
        }
    }

    if (value.endsWith('es')) {
        // eslint-disable-next-line no-magic-numbers -- 'es' suffix length
        const withoutEs = value.slice(0, -2);
        if (withoutEs) {
            candidates.add(withoutEs);
        }
    }

    if (value.endsWith('ies')) {
        // eslint-disable-next-line no-magic-numbers -- 'ies' suffix length
        const withoutIes = `${value.slice(0, -3)}y`;
        if (withoutIes) {
            candidates.add(withoutIes);
        }
    }

    return [...candidates];
}

export function getToneConfig(tone: EntityTone): EntityToneConfig {
    return ENTITIES[tone];
}

export function resolveEntityTone(input?: string | null): EntityTone {
    if (!input) {
        return 'class';
    }

    const normalized = input.trim().toLowerCase();
    if (!normalized) {
        return 'class';
    }

    for (const candidate of buildToneCandidates(normalized)) {
        const synonymTone = TONE_SYNONYMS[candidate];
        if (synonymTone) {
            return synonymTone;
        }

        if (isEntityTone(candidate)) {
            return candidate;
        }
    }

    return 'class';
}

export function formatEntityKindLabel(input?: string | null): string {
    const tone = resolveEntityTone(input);
    return getToneConfig(tone).label;
}
