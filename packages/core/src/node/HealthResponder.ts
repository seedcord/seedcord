import type { HealthCheckConfig, HealthCheckOption } from '@seedcord/types';
import type { IncomingMessage, ServerResponse } from 'node:http';

const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;
const DEFAULT_HEALTH_CHECK_PATH = '/health';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function healthCheckConfig(option?: HealthCheckOption): HealthCheckConfig | undefined {
    if (option === false) return undefined;
    return typeof option === 'object' ? option : {};
}

export class HealthResponder {
    public readonly path: string;

    constructor(path?: string) {
        this.path = path ?? DEFAULT_HEALTH_CHECK_PATH;
    }

    public static fromOption(option?: HealthCheckOption): HealthResponder | undefined {
        const config = healthCheckConfig(option);
        return config && new HealthResponder(config.path);
    }

    public tryRespond(req: IncomingMessage, res: ServerResponse): boolean {
        if (!this.matches(req.method, req.url)) return false;

        res.writeHead(HTTP_OK, JSON_HEADERS);
        res.end(this.body());
        return true;
    }

    public answer(request: Request, ready: boolean): Response | undefined {
        if (!this.matches(request.method, new URL(request.url).pathname)) return undefined;
        if (!ready) return new Response(null, { status: HTTP_SERVICE_UNAVAILABLE });
        return new Response(this.body(), { status: HTTP_OK, headers: JSON_HEADERS });
    }

    private matches(method: string | undefined, path: string | undefined): boolean {
        return method === 'GET' && path === this.path;
    }

    private body(): string {
        return JSON.stringify({ status: 'ok', timestamp: Date.now() });
    }
}
