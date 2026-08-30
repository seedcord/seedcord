const FALLBACK_URL = 'https://guide.seedcord.org';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_URL;
export const SITE_NAME = 'seedcord guide';
export const SITE_DESCRIPTION = 'The guide to building Discord bots with seedcord.';
export const HOME_URL = 'https://seedcord.org';

// run the docs app on 3001 next to the guide to check docs links in dev mode
const DOCS_FALLBACK = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://docs.seedcord.org';

export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? DOCS_FALLBACK;
export const REPO_URL = 'https://github.com/seedcord/seedcord';
