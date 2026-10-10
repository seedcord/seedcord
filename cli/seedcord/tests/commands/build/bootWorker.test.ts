import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { bootWorker } from '#commands/build/builder/bootWorker';

import type { Plugin } from 'vite';

// stands in for a worker that loads and answers every request with 200
const answersOk: Plugin = {
    name: 'test:answers-ok',
    configurePreviewServer(server) {
        server.middlewares.use((_request, response) => {
            response.statusCode = 200;
            response.end();
        });
    }
};

const closesConnection: Plugin = {
    name: 'test:closes-connection',
    configurePreviewServer(server) {
        server.middlewares.use((request) => {
            request.socket.destroy();
        });
    }
};

describe('bootWorker', () => {
    it('throws CliEdgeBootFailed when the worker closes the connection without answering', async () => {
        await expect(bootWorker({ root: import.meta.dirname, plugins: [closesConnection] })).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeBootFailed,
            cause: expect.any(TypeError) as TypeError
        });
    });

    it('gives the status in CliEdgeBootFailed when the worker answers without logging an error', async () => {
        await expect(bootWorker({ root: import.meta.dirname, plugins: [answersOk] })).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeBootFailed,
            message: expect.stringContaining('200') as string
        });
    });
});
