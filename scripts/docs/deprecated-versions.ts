import type { PackageVersionsInput } from '@seedcord/docs-engine';

const REGISTRY = 'https://registry.npmjs.org';

interface Packument {
    versions?: Record<string, { deprecated?: string }>;
}

// npm sets `deprecated` to the message string on every deprecated version of a packument
async function deprecatedVersionsOf(fullName: string): Promise<ReadonlySet<string>> {
    const response = await fetch(`${REGISTRY}/${fullName.replace('/', '%2f')}`);
    if (!response.ok) throw new Error(`${fullName}: registry answered ${String(response.status)}`);

    const packument = (await response.json()) as Packument;
    return new Set(
        Object.entries(packument.versions ?? {})
            .filter(([, meta]) => typeof meta.deprecated === 'string')
            .map(([version]) => version)
    );
}

export async function deprecatedByPackage(
    inputs: readonly PackageVersionsInput[],
    warn: (message: string) => void
): Promise<Map<string, ReadonlySet<string>>> {
    const found = new Map<string, ReadonlySet<string>>();

    await Promise.all(
        inputs.map(async (input) => {
            try {
                found.set(input.fullName, await deprecatedVersionsOf(input.fullName));
            } catch (error) {
                // an unreachable registry keeps every version
                warn(`could not read deprecations for ${input.fullName}: ${String(error)}`);
            }
        })
    );

    return found;
}

export function withoutDeprecated(
    inputs: readonly PackageVersionsInput[],
    deprecated: ReadonlyMap<string, ReadonlySet<string>>
): PackageVersionsInput[] {
    return inputs.map((input) => {
        const drop = deprecated.get(input.fullName);
        if (!drop || drop.size === 0) return input;
        return { ...input, versions: input.versions.filter((version) => !drop.has(version)) };
    });
}
