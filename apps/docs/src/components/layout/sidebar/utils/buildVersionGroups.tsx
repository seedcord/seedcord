import { Badge } from '@seedcord/ui';

import type { PackageVersionCatalog } from '@lib/docs/types';
import type { DropdownGroup, DropdownOption } from '@seedcord/ui';

const LATEST_BADGE = (
    <Badge tone="accent" variant="chip">
        latest
    </Badge>
);

const toOption = (version: PackageVersionCatalog): DropdownOption => ({
    value: version.id,
    label: version.label,
    ...(version.isLatest ? { trailing: LATEST_BADGE } : {})
});

// Does not sort; callers must pass versions in the order they should render.
export function buildVersionGroups(versions: readonly PackageVersionCatalog[]): DropdownGroup[] {
    const byChannel = versions.reduce<Record<'stable' | 'prerelease', DropdownOption[]>>(
        (acc, version) => {
            acc[version.channel].push(toOption(version));
            return acc;
        },
        { stable: [], prerelease: [] }
    );

    const groups: DropdownGroup[] = [];
    if (byChannel.stable.length) {
        groups.push({ id: 'stable', options: byChannel.stable });
    }
    if (byChannel.prerelease.length) {
        groups.push({ id: 'prerelease', label: 'pre-release', options: byChannel.prerelease });
    }

    return groups;
}
