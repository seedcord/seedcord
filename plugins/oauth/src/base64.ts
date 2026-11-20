// a store and a cookie keep text, and base64 writes raw bytes as text.
export function toBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
}

export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

// the base64 alphabet that's safe in a url and a cookie, without padding. PKCE requires it
export function toBase64Url(bytes: Uint8Array): string {
    return toBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
