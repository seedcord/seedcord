import { createServer } from 'node:http';

import type { DevServer } from '@seedcord/types/internal';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import type { ViteDevServer } from 'vite';

// vite's client pings with vite-ping until a restarted server answers
const VITE_SOCKETS: ReadonlySet<string | undefined> = new Set(['vite-hmr', 'vite-ping']);

// vite opens its own port without a server here. this one never listens
export function viteSocketServer(): Server {
    return createServer();
}

export class DevFront implements DevServer {
    private readonly upgraded = new Set<Duplex>();

    constructor(
        private readonly vite: ViteDevServer,
        private readonly sockets: Server
    ) {}

    // the bot answers every POST. if vite got one for a path with a static file, discord would get a 405
    public servedByVite({ method }: IncomingMessage): boolean {
        return method === 'GET' || method === 'HEAD';
    }

    public serve(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
        if (!this.servedByVite(request)) return Promise.resolve(false);
        return new Promise((resolve) => {
            this.vite.middlewares(request, response, () => resolve(false));
            response.once('close', () => resolve(true));
        });
    }

    public upgrade(request: IncomingMessage, socket: Duplex, head: Buffer): boolean {
        if (!VITE_SOCKETS.has(request.headers['sec-websocket-protocol'])) return false;
        this.upgraded.add(socket);
        socket.once('close', () => this.upgraded.delete(socket));
        this.sockets.emit('upgrade', request, socket, head);
        return true;
    }

    // vite only closes these with its own server, and that server closes after the one in front of it
    public closeSockets(): void {
        for (const socket of this.upgraded) socket.destroy();
    }
}
