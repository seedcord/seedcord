import type { IncomingMessage, ServerResponse } from 'node:http';

const HTTP_OK = 200;
const DEFAULT_HEALTH_CHECK_PATH = '/health';

export class HealthResponder {
    public readonly path: string;

    constructor(path?: string) {
        this.path = path ?? DEFAULT_HEALTH_CHECK_PATH;
    }

    public tryRespond(req: IncomingMessage, res: ServerResponse): boolean {
        if (req.method !== 'GET' || req.url !== this.path) return false;

        res.writeHead(HTTP_OK, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return true;
    }
}
