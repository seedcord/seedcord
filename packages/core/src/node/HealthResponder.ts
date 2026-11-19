import type { HealthCheckConfig, HealthCheckOption } from '@seedcord/types';

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

    public answer(request: Request, ready: boolean): Response | undefined {
        if (request.method !== 'GET' || new URL(request.url).pathname !== this.path) return undefined;
        if (!ready) return new Response(null, { status: HTTP_SERVICE_UNAVAILABLE });
        return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
            status: HTTP_OK,
            headers: JSON_HEADERS
        });
    }
}
