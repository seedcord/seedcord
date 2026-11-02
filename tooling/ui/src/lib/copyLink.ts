// leave anchorId out to copy the page url with no fragment
export async function copyLink(anchorId?: string): Promise<void> {
    const url = new URL(globalThis.location.href);
    url.hash = anchorId ?? '';
    // navigator.clipboard is undefined outside a secure context
    await navigator.clipboard.writeText(url.toString());
}
