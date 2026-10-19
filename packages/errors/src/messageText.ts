import { paint } from './palette';

// a reason from a caught error may or may not end in a period
export function sentence(text: string): string {
    // a multi-line reason usually ends in a code frame
    if (text.includes('\n')) return text;
    return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function reasonThen(reason: string, next: string): string {
    return `${sentence(reason)}${reason.includes('\n') ? '\n' : ' '}${next}`;
}

// @seedcord/utils depends on this package, so its pluralize is out of reach here
const plurals = new Intl.PluralRules('en');
export const allOf = new Intl.ListFormat('en', { type: 'conjunction' });
export const oneOf = new Intl.ListFormat('en', { type: 'disjunction' });

export function isOne(count: number): boolean {
    return plurals.select(count) === 'one';
}

export function counted(count: number, one: string, many: string): string {
    return `${count} ${isOne(count) ? one : many}`;
}

export const quoted = (value: string): string => paint.sky(JSON.stringify(value));
