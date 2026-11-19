// seedcord dev rewrites every request to / and sends the real path in this header
export const DEV_URL_HEADER = 'x-seedcord-dev-url';

// seedcord build and seedcord dev send the header, and only a seedcord bot answers with the status
export const WORKER_PROBE = { header: 'x-seedcord-probe', status: 204 } as const;
