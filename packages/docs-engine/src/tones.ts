// Node-free, so this is exported from the client subset. Presentation (icons, Tailwind classes)
// lives in the consuming app, not here.
export type EntityTone = 'class' | 'interface' | 'type' | 'function' | 'enum' | 'variable';

const TONE_DIRECTORY_MAP = {
    class: 'classes',
    interface: 'interfaces',
    type: 'types',
    function: 'functions',
    enum: 'enums',
    variable: 'variables'
} as const;

export type DirectoryEntityFrontend = (typeof TONE_DIRECTORY_MAP)[EntityTone];

export function toneToDirectory(tone: EntityTone): DirectoryEntityFrontend {
    return TONE_DIRECTORY_MAP[tone];
}

const TONE_LABELS: Record<EntityTone, string> = {
    class: 'Class',
    interface: 'Interface',
    type: 'Type',
    function: 'Function',
    enum: 'Enum',
    variable: 'Variable'
};

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

function isEntityTone(value: string): value is EntityTone {
    return value in TONE_LABELS;
}

function buildToneCandidates(value: string): string[] {
    const candidates = new Set<string>([value]);

    if (value.endsWith('s')) {
        const withoutS = value.slice(0, -1);
        if (withoutS) candidates.add(withoutS);
    }

    if (value.endsWith('es')) {
        // eslint-disable-next-line no-magic-numbers -- 'es' suffix length
        const withoutEs = value.slice(0, -2);
        if (withoutEs) candidates.add(withoutEs);
    }

    if (value.endsWith('ies')) {
        // eslint-disable-next-line no-magic-numbers -- 'ies' suffix length
        const withoutIes = `${value.slice(0, -3)}y`;
        if (withoutIes) candidates.add(withoutIes);
    }

    return [...candidates];
}

export function resolveEntityTone(input?: string | null): EntityTone {
    if (!input) return 'class';

    const normalized = input.trim().toLowerCase();
    if (!normalized) return 'class';

    for (const candidate of buildToneCandidates(normalized)) {
        const synonymTone = TONE_SYNONYMS[candidate];
        if (synonymTone) return synonymTone;
        if (isEntityTone(candidate)) return candidate;
    }

    return 'class';
}

export function formatEntityKindLabel(input?: string | null): string {
    return TONE_LABELS[resolveEntityTone(input)];
}
