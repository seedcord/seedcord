import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { isTimezone } from './isTimezone';

export function requireTimezone(source: string, timezone: string | undefined): void {
    if (timezone === undefined || isTimezone(timezone)) return;

    throw new SeedcordTypeError(SeedcordErrorCode.PluginTasksInvalidOption, [
        source,
        timezone,
        `That's not a timezone ${paint.bold('Intl')} supports. Write an IANA name like ${paint.sky("'America/New_York'")} or ${paint.sky("'UTC'")}.`
    ]);
}
