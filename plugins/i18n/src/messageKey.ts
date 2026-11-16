// the key t() takes: 'email-field' for a message's text, 'email-field.placeholder' for an attribute
export function messageKey(id: string, attribute?: string): string {
    return attribute === undefined ? id : `${id}.${attribute}`;
}

// the first dot ends the id because a fluent id can't hold one
export function splitKey(key: string): [id: string, attribute?: string] {
    const dot = key.indexOf('.');
    return dot === -1 ? [key] : [key.slice(0, dot), key.slice(dot + 1)];
}
