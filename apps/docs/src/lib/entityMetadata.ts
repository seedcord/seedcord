import { Braces, FunctionSquare, ListTree, Puzzle, SquareStack, Variable } from 'lucide-react';

const ENTITIES_INTERNAL = {
    class: {
        label: 'Class',
        icon: SquareStack,
        styles: {
            heading: 'text-(--tone-class-heading)',
            item: [
                'hover:border-(--tone-class-badge-border)',
                'hover:bg-(--tone-class-item-bg)',
                'focus-visible:outline-(--entity-class)'
            ].join(' '),
            badge: ['border-(--tone-class-badge-border)', 'bg-(--tone-class-badge-bg)', 'text-(--entity-class)'].join(
                ' '
            ),
            tag: [
                'border-(--tone-class-badge-border)',
                'bg-(--tone-class-tag-bg)',
                'text-(--tone-class-tag-text)'
            ].join(' '),
            accent: 'text-(--tone-class-heading)'
        }
    },
    interface: {
        label: 'Interface',
        icon: Puzzle,
        styles: {
            heading: 'text-(--tone-interface-heading)',
            item: [
                'hover:border-(--tone-interface-badge-border)',
                'hover:bg-(--tone-interface-item-bg)',
                'focus-visible:outline-(--entity-interface)'
            ].join(' '),
            badge: [
                'border-(--tone-interface-badge-border)',
                'bg-(--tone-interface-badge-bg)',
                'text-(--entity-interface)'
            ].join(' '),
            tag: [
                'border-(--tone-interface-badge-border)',
                'bg-(--tone-interface-tag-bg)',
                'text-(--tone-interface-tag-text)'
            ].join(' '),
            accent: 'text-(--tone-interface-heading)'
        }
    },
    type: {
        label: 'Type',
        icon: Braces,
        styles: {
            heading: 'text-(--tone-type-heading)',
            item: [
                'hover:border-(--tone-type-badge-border)',
                'hover:bg-(--tone-type-item-bg)',
                'focus-visible:outline-(--entity-type)'
            ].join(' '),
            badge: ['border-(--tone-type-badge-border)', 'bg-(--tone-type-badge-bg)', 'text-(--entity-type)'].join(' '),
            tag: ['border-(--tone-type-badge-border)', 'bg-(--tone-type-tag-bg)', 'text-(--tone-type-tag-text)'].join(
                ' '
            ),
            accent: 'text-(--tone-type-heading)'
        }
    },
    function: {
        label: 'Function',
        icon: FunctionSquare,
        styles: {
            heading: 'text-(--tone-func-heading)',
            item: [
                'hover:border-(--tone-func-badge-border)',
                'hover:bg-(--tone-func-item-bg)',
                'focus-visible:outline-(--entity-function)'
            ].join(' '),
            badge: ['border-(--tone-func-badge-border)', 'bg-(--tone-func-badge-bg)', 'text-(--entity-function)'].join(
                ' '
            ),
            tag: ['border-(--tone-func-badge-border)', 'bg-(--tone-func-tag-bg)', 'text-(--tone-func-tag-text)'].join(
                ' '
            ),
            accent: 'text-(--tone-func-heading)'
        }
    },
    enum: {
        label: 'Enum',
        icon: ListTree,
        styles: {
            heading: 'text-(--tone-enum-heading)',
            item: [
                'hover:border-(--tone-enum-badge-border)',
                'hover:bg-(--tone-enum-item-bg)',
                'focus-visible:outline-(--entity-enum)'
            ].join(' '),
            badge: ['border-(--tone-enum-badge-border)', 'bg-(--tone-enum-badge-bg)', 'text-(--entity-enum)'].join(' '),
            tag: ['border-(--tone-enum-badge-border)', 'bg-(--tone-enum-tag-bg)', 'text-(--tone-enum-tag-text)'].join(
                ' '
            ),
            accent: 'text-(--tone-enum-heading)'
        }
    },
    variable: {
        label: 'Variable',
        icon: Variable,
        styles: {
            heading: 'text-(--tone-var-heading)',
            item: [
                'hover:border-(--tone-var-badge-border)',
                'hover:bg-(--tone-var-item-bg)',
                'focus-visible:outline-(--entity-variable)'
            ].join(' '),
            badge: ['border-(--tone-var-badge-border)', 'bg-(--tone-var-badge-bg)', 'text-(--entity-variable)'].join(
                ' '
            ),
            tag: ['border-(--tone-var-badge-border)', 'bg-(--tone-var-tag-bg)', 'text-(--tone-var-tag-text)'].join(' '),
            accent: 'text-(--tone-var-heading)'
        }
    }
} as const;

export type EntityTone = keyof typeof ENTITIES_INTERNAL;
export type EntityToneConfig = (typeof ENTITIES_INTERNAL)[EntityTone];
export type EntityToneStyle = EntityToneConfig['styles'];

export const ENTITIES: typeof ENTITIES_INTERNAL = ENTITIES_INTERNAL;

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

const SINGLE_CHARACTER = 1;
const DOUBLE_CHARACTER = 2;
const TRIPLE_CHARACTER = 3;

const buildToneCandidates = (value: string): string[] => {
    const candidates = new Set<string>([value]);

    if (value.endsWith('s')) {
        const withoutS = value.slice(0, value.length - SINGLE_CHARACTER);
        if (withoutS) {
            candidates.add(withoutS);
        }
    }

    if (value.endsWith('es')) {
        const withoutEs = value.slice(0, value.length - DOUBLE_CHARACTER);
        if (withoutEs) {
            candidates.add(withoutEs);
        }
    }

    if (value.endsWith('ies')) {
        const withoutIes = `${value.slice(0, value.length - TRIPLE_CHARACTER)}y`;
        if (withoutIes) {
            candidates.add(withoutIes);
        }
    }

    return [...candidates];
};

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
