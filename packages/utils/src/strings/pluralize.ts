const plurals = new Intl.PluralRules('en');

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
    return plurals.select(count) === 'one' ? singular : plural;
}
