import { commandRefOf } from '@seedcord/core/internal';

// discord keeps command names unique per type
export function commandKey(command: Parameters<typeof commandRefOf>[0]): string {
    const { name, type } = commandRefOf(command);
    return `${type}:${name}`;
}
