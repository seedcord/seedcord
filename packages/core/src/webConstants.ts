// seedcord dev rewrites every request to / and sends the real path in this header
export const DEV_URL_HEADER = 'x-seedcord-dev-url';

// seedcord build and seedcord dev send the header, and only a seedcord bot answers with the status
export const WORKER_PROBE = { header: 'x-seedcord-probe', status: 204 } as const;

// vite puts a hash of each file's content in its name under assets/, which lets a browser keep it for good
export const HASHED_ASSETS = { path: '/assets/', cacheControl: 'public, max-age=31536000, immutable' } as const;

// a 307 like cloudflare's static assets because a browser caches a 301 for good
export const FOLDER_REDIRECT = 307;

// a node bot's server.port, and the port that seedcord dev serves an edge bot on
export const DEFAULT_SERVER_PORT = 3000;

export const INTERNAL_SERVER_ERROR = 500;
export const SERVICE_UNAVAILABLE = 503;
