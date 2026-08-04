import { describe, expect, it } from 'vitest';

import { HealthResponder } from '@node/HealthResponder';

import type { IncomingMessage, ServerResponse } from 'node:http';

interface Written {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
}

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
});
