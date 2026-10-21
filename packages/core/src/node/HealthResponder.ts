import type { HealthCheckOption } from '@seedcord/types';
import type { IncomingMessage, ServerResponse } from 'node:http';

const HTTP_OK = 200;
const DEFAULT_HEALTH_CHECK_PATH = '/health';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export class HealthResponder {
    public readonly path: string;

    constructor(path?: string) {
        this.path = path ?? DEFAULT_HEALTH_CHECK_PATH;
    }

    public static fromOption(option?: HealthCheckOption): HealthResponder | undefined {
        if (option === false) return undefined;
        return new HealthResponder(typeof option === 'object' ? option.path : undefined);
    }

    public matches(method: string | undefined, path: string | undefined): boolean {
        return method === 'GET' && path === this.path;
    }

    public tryRespond(req: IncomingMessage, res: ServerResponse): boolean {
        if (!this.matches(req.method, req.url)) return false;

        res.writeHead(HTTP_OK, JSON_HEADERS);
        res.end(this.body());
        return true;
    }

    public ok(): Response {
        return new Response(this.body(), { status: HTTP_OK, headers: JSON_HEADERS });
    }

    private body(): string {
        return JSON.stringify({ status: 'ok', timestamp: Date.now() });
    }
}
