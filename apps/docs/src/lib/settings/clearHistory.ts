// every docs-owned localStorage key must start with this so clearDocsHistory finds it
export const DOCS_STORAGE_PREFIX = 'docs.';

export function clearDocsHistory(): void {
    try {
        if (typeof window === 'undefined') return;

        const { localStorage } = window;
        const stale: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key?.startsWith(DOCS_STORAGE_PREFIX)) stale.push(key);
        }
        for (const key of stale) localStorage.removeItem(key);

        // expire cookies visible to this path
        try {
            const cookies = document.cookie
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean);

            for (const cookie of cookies) {
                const eq = cookie.indexOf('=');
                const name = eq > -1 ? cookie.slice(0, eq) : cookie;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            }
        } catch {
            // ignore cookie clearing failures
        }
    } catch {
        // ignore overall failures
    }
}
