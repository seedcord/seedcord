// seedcord dev rewrites every request to / and sends the real path in this header
export const DEV_URL_HEADER = 'x-seedcord-dev-url';

// seedcord build and seedcord dev send the header, and only a seedcord bot answers with the status
export const WORKER_PROBE = { header: 'x-seedcord-probe', status: 204 } as const;

// a browser can cache these forever because vite puts a hash of each file's content in its name
export const HASHED_ASSETS = {
    path: '/assets/',
    cacheControl: `public, max-age=${String(365 * 24 * 60 * 60)}, immutable`
} as const;

// 307 to match cloudflare's static assets. a browser caches a 301 forever
export const FOLDER_REDIRECT = 307;

// a node bot's server.port, and the port that seedcord dev serves an edge bot on
export const DEFAULT_SERVER_PORT = 3000;

export const INTERNAL_SERVER_ERROR = 500;
export const SERVICE_UNAVAILABLE = 503;
