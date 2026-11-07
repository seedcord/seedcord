export function isTimezone(timezone: string): boolean {
    try {
        // eslint-disable-next-line no-new -- the constructor is the check, since it throws for a zone that Intl doesn't support
        new Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    } catch {
        return false;
    }
}
