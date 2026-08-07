import { Badge } from '@seedcord/ui';

import type { PackageVersionCatalog } from '@lib/docs/types';
import type { DropdownGroup, DropdownOption } from '@seedcord/ui';

const BADGES: Record<NonNullable<PackageVersionCatalog['badge']>, DropdownOption['trailing']> = {
    latest: (
        <Badge tone="accent" variant="chip">
            latest
        </Badge>
    ),
    next: (
        <Badge tone="neutral" variant="chip">
            next
        </Badge>
    )
};

const NO_STABLE_OPTION: DropdownOption = {
    value: '__no-stable__',
    label: 'No stable release yet',
    disabled: true
};

const toOption = (version: PackageVersionCatalog): DropdownOption => ({
    value: version.id,
    label: version.label,
    ...(version.badge ? { trailing: BADGES[version.badge] } : {})
});

// doesn't sort, so callers must already order versions before passing them in
export function buildVersionGroups(versions: readonly PackageVersionCatalog[]): DropdownGroup[] {
    const byChannel = versions.reduce<Record<'stable' | 'prerelease', DropdownOption[]>>(
        (acc, version) => {
            acc[version.channel].push(toOption(version));
            return acc;
        },
        { stable: [], prerelease: [] }
    );

    const groups: DropdownGroup[] = [
        { id: 'stable', options: byChannel.stable.length ? byChannel.stable : [NO_STABLE_OPTION] }
    ];
    if (byChannel.prerelease.length) {
        groups.push({ id: 'prerelease', label: 'pre-release', options: byChannel.prerelease });
    }

    return groups;
}
