import { existsSync, globSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';

import { FOLDER_REDIRECT, HASHED_ASSETS } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import {
    CLIENT_FOLDER,
    INDEX_PAGE,
    isGetOrHead,
    isInside,
    posixRelative,
    staticFileAt,
    toPosixPath,
    withoutQuery
} from '@seedcord/utils/internal';
import { isCSSRequest, send } from 'vite';

import { CLIENT_ENVIRONMENT, viteEnvironment } from './botEnvironment';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ServerResponse } from 'node:http';
import type { Connect, Plugin, ResolvedConfig, ViteDevServer } from 'vite';

const PLUGIN_NAME = 'seedcord:client-pages';
const PAGES_GLOB = `**/${INDEX_PAGE}`;

// undefined for vite's own paths, like /@vite/client, and for a plugin's virtual module under /@id/__x00__.
// vite loads any absolute path after /@fs/ or /@id/. those paths get the same checks as one under vite's root
function fileAt(path: string, root: string): string | undefined {
    const prefix = ['/@fs/', '/@id/'].find((start) => path.startsWith(start));
    if (prefix === undefined) return path.startsWith('/@') ? undefined : toPosixPath(join(root, path));
    const rest = path.slice(prefix.length - 1);
    return rest.startsWith('/__x00__') ? undefined : toPosixPath(resolve(rest));
}

// a page is at its folder's path, and a public/ file at its own. vite's publicDir is '' when it's off
function existsIn(folder: string, path: string): boolean {
    const file = join(folder, path);
    return folder !== '' && isInside(folder, file) && existsSync(file);
}

// cloudflare serves vite's hashed files with max-age=0 unless a _headers rule sets another cache
const ASSET_HEADERS = `${HASHED_ASSETS.path}*\n  Cache-Control: ${HASHED_ASSETS.cacheControl}\n`;

export class ClientPages {
    private readonly dir: string;
    private readonly pages: readonly string[];
    private readonly configDir: string;

    constructor({ configFile, client }: Pick<ResolvedSeedcordConfig, 'configFile' | 'client'>) {
        this.configDir = dirname(configFile);
        this.dir = client.dir;
        this.pages = globSync(PAGES_GLOB, { cwd: this.dir, exclude: ['**/node_modules/**'] }).map((page) =>
            join(this.dir, page)
        );
    }

    public get hasPages(): boolean {
        return this.pages.length > 0;
    }

    // a page's scripts are browser code. a client folder without a page is just bot code
    public get skippedFolders(): string[] {
        return this.hasPages ? [this.dir] : [];
    }

    // vite gets only what a page loads. it would hand the bot's source to anyone with the tunnel url
    public browserCanLoad(url: string, vite: ViteDevServer): boolean {
        let path: string;
        try {
            path = decodeURIComponent(withoutQuery(url));
        } catch {
            return false;
        }
        const { root, publicDir, assetsInclude } = vite.config;
        if (isCSSRequest(path) || assetsInclude(path)) return true;
        const file = fileAt(path, root);
        if (file === undefined || file.includes('/node_modules/')) return true;
        if (viteEnvironment(vite.environments, CLIENT_ENVIRONMENT).moduleGraph.getModulesByFile(file)) return true;
        // without a page, the client folder just holds bot code
        const pages = this.hasPages && (isInside(this.dir, file) || existsIn(this.dir, path));
        return pages || existsIn(publicDir, path);
    }

    // the pages middleware and the build's page inputs only exist when dev starts with a page
    public restartPatterns(): string[] {
        return this.hasPages ? [] : [toPosixPath(join(this.dir, PAGES_GLOB))];
    }

    // a node build writes each bot module under root to the same path in outDir, and a bot with pages serves outDir/client
    public assertFolderFree(root: string, outDir: string): void {
        const folder = join(root, CLIENT_FOLDER);
        if (this.hasPages && folder !== this.dir && existsSync(folder)) {
            throw new SeedcordTypeError(SeedcordErrorCode.CliBuildClientFolderTaken, [
                folder,
                join(outDir, CLIENT_FOLDER)
            ]);
        }
    }

    public vitePlugin({ edge }: { edge: boolean }): Plugin {
        const publicDir = join(this.configDir, 'public');
        // cloudflare deploys public/ for any worker. a node bot serves it once it has pages
        if (!this.hasPages) return { name: PLUGIN_NAME, config: () => ({ publicDir: edge ? publicDir : false }) };
        const folderFrom = this.folderFrom.bind(this);

        return {
            name: PLUGIN_NAME,
            config: () => ({
                publicDir,
                environments: { [CLIENT_ENVIRONMENT]: { build: { rolldownOptions: { input: [...this.pages] } } } }
            }),
            configResolved: (config) => this.assertServable(config, publicDir),
            configureServer: (server) => {
                server.middlewares.use(this.servePages(server));
            },
            // post so vite has already written each page's html
            generateBundle: {
                order: 'post',
                handler(_options, bundle) {
                    if (this.environment.name !== CLIENT_ENVIRONMENT) return;
                    const folder = `${folderFrom(this.environment.config.root)}/`;
                    for (const file of Object.values(bundle)) {
                        if (file.type === 'asset' && file.fileName.startsWith(folder)) {
                            file.fileName = file.fileName.slice(folder.length);
                        }
                    }
                    if (edge && !existsSync(join(publicDir, '_headers'))) {
                        this.emitFile({ type: 'asset', fileName: '_headers', source: ASSET_HEADERS });
                    }
                }
            }
        };
    }

    private folderFrom(root: string): string {
        return posixRelative(root, this.dir);
    }

    private assertServable(config: ResolvedConfig, publicDir: string): void {
        if (config.base !== '/') throw new SeedcordTypeError(SeedcordErrorCode.CliViteBaseUnsupported, [config.base]);
        const taken = (folder: string): SeedcordTypeError =>
            new SeedcordTypeError(SeedcordErrorCode.CliAssetsPathTaken, [folder, HASHED_ASSETS.path]);
        const pagesAssets = join(this.dir, HASHED_ASSETS.path);
        if (this.pages.some((page) => isInside(pagesAssets, page))) throw taken(pagesAssets);
        const publicAssets = join(publicDir, HASHED_ASSETS.path);
        if (existsSync(publicAssets)) throw taken(publicAssets);
    }

    private servePages(server: ViteDevServer): Connect.NextHandleFunction {
        const { root } = server.config;
        const clientPath = `/${this.folderFrom(root)}`;

        const answer = async (request: Connect.IncomingMessage, response: ServerResponse): Promise<boolean> => {
            const url = request.url ?? '/';
            // new URL(url, base) reads //evil.test/ as a host. production keeps it in the path
            const found = await staticFileAt(this.dir, new URL(`http://dev${url}`));
            if (found === undefined) return false;
            if ('redirect' in found) {
                response.writeHead(FOLDER_REDIRECT, { location: found.redirect }).end();
                return true;
            }
            if (basename(found.file) === INDEX_PAGE) {
                const html = await readFile(found.file, 'utf8');
                const page = await server.transformIndexHtml(`/${posixRelative(root, found.file)}`, html);
                send(request, response, page, 'html', { headers: server.config.server.headers });
                return true;
            }
            // the bot answers all the other .html files because a build only writes the pages
            if (extname(found.file) !== '.html') request.url = `${clientPath}${url}`;
            return false;
        };

        return (request, response, next) => {
            if (!isGetOrHead(request.method)) {
                next();
                return;
            }
            answer(request, response).then((answered) => {
                if (!answered) next();
            }, next);
        };
    }
}
