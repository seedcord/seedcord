import { describe, expect, it } from 'vitest';

import { HealthResponder } from '@node/HealthResponder';

import type { IncomingMessage, ServerResponse } from 'node:http';

interface Written {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
}

// justified: the responder reads method and url and writes a status, headers, and a body
function exchange(method: string, url: string): { req: IncomingMessage; res: ServerResponse; written: Written } {
    const written: Written = {};
    const req = { method, url } as unknown as IncomingMessage;
    const res = {
        writeHead(status: number, headers: Record<string, string>) {
            written.status = status;
            written.headers = headers;
        },
        end(body: string) {
            written.body = body;
        }
    } as unknown as ServerResponse;

    return { req, res, written };
}

describe('HealthResponder', () => {
    it('answers 200 with an ok body on a GET of the health path', () => {
        const responder = new HealthResponder();
        const { req, res, written } = exchange('GET', responder.path);

        expect(responder.tryRespond(req, res)).toBe(true);
        expect(written.status).toBe(200);
        expect(JSON.parse(written.body ?? '')).toMatchObject({ status: 'ok' });
    });

    it('answers on the configured path', () => {
        const responder = new HealthResponder('/healthz');
        const { req, res, written } = exchange('GET', '/healthz');

        expect(responder.tryRespond(req, res)).toBe(true);
        expect(written.status).toBe(200);
    });

    it.each([
        ['a different path', 'GET', '/elsewhere'],
        ['the default path once a custom one is set', 'GET', '/health'],
        ['a POST to the health path', 'POST', '/healthz']
    ])('writes nothing for %s', (_case, method, url) => {
        const responder = new HealthResponder('/healthz');
        const { req, res, written } = exchange(method, url);

        expect(responder.tryRespond(req, res)).toBe(false);
        expect(written.status).toBeUndefined();
    });
});
