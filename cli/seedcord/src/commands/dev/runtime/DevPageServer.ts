import { createServer } from 'node:http';

import { transformPage } from '@seedcord/core/internal';
import { isGetOrHead } from '@seedcord/utils/internal';

import type { DevServer } from '@seedcord/types/internal';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Connect, ViteDevServer } from 'vite';

// vite's client pings with vite-ping until a restarted server answers
const VITE_SOCKETS: ReadonlySet<string | undefined> = new Set(['vite-hmr', 'vite-ping']);

// the bot answers every POST. if vite got one for a path with a static file, discord would get a 405
export function servedByVite({ method }: IncomingMessage): boolean {
    return isGetOrHead(method);
}

export class DevPageServer implements DevServer {
    private readonly upgraded = new Set<Duplex>();

    private constructor(
        public readonly vite: ViteDevServer,
        // vite's ws.server. upgrade() hands its sockets over here
        private readonly sockets: Server,
        public readonly servesPages: boolean
    ) {}

    // this creates the socket server first because vite reads it from its config
    public static async open(
        openVite: (sockets: Server) => Promise<ViteDevServer>,
        servesPages: boolean
    ): Promise<DevPageServer> {
        const sockets = createServer();
        return new DevPageServer(await openVite(sockets), sockets, servesPages);
    }

    public get middlewares(): Connect.Server {
        return this.vite.middlewares;
    }

    public serve(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
        if (!servedByVite(request)) return Promise.resolve(false);
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

    // the html hooks of vite plugins run here too, like react's refresh preamble
    public transformPage(path: string, response: Response): Promise<Response> {
        return transformPage(response, (html) => this.vite.transformIndexHtml(path, html));
    }
}
