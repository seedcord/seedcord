export const clearDocsHistory = (): void => {
    try {
        if (typeof window === 'undefined') return;

        // Remove docs.* keys from localStorage
        Object.keys(window.localStorage)
            .filter((k) => k.startsWith('docs.'))
            .forEach((k) => window.localStorage.removeItem(k));

        // Best-effort: expire cookies visible to this path
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
};

export default clearDocsHistory;
