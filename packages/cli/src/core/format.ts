export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function includesIgnoreCase(text: string, search: string): boolean {
    return text.toLowerCase().includes(search.trim().toLowerCase());
}
