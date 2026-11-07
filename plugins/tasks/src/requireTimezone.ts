import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { isTimezone } from './isTimezone';

/** Throws `PluginTasksInvalidOption` for a timezone `Intl` doesn't support. `option` names where it came from. */
export function requireTimezone(option: string, timezone: string | undefined): void {
    if (timezone === undefined || isTimezone(timezone)) return;

    throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidOption, [
        option,
        timezone,
        `That's not a timezone ${paint.bold('Intl')} supports. Write an IANA name like ${paint.sky("'America/New_York'")} or ${paint.sky("'UTC'")}.`
    ]);
}
