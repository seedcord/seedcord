import { existsSync, globSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';

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
    toPosixPath
} from '@seedcord/utils/internal';
import { searchForWorkspaceRoot, send } from 'vite';

import { CLIENT_ENVIRONMENT } from './botEnvironment';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ServerResponse } from 'node:http';
import type { Connect, Plugin, ResolvedConfig, ViteDevServer } from 'vite';

const PLUGIN_NAME = 'seedcord:client-pages';
const PAGES_GLOB = `**/${INDEX_PAGE}`;

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

    // vite only lets a browser read the pages folder when dev starts with a page
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
        const folderFrom = this.folderFrom.bind(this);
        // vite serves any file in the workspace otherwise, and the tunnel url would hand anyone the bot's source
        const allow = (folders: string[]): { server: { fs: { allow: string[] } } } => ({
            server: { fs: { allow: [...folders, join(searchForWorkspaceRoot(this.configDir), 'node_modules')] } }
        });
        // cloudflare deploys public/ for any worker. a node bot serves it once it has pages
        if (!this.hasPages)
            return { name: PLUGIN_NAME, config: () => ({ ...allow([]), publicDir: edge ? publicDir : false }) };

        return {
            name: PLUGIN_NAME,
            config: () => ({
                ...allow([this.dir]),
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
