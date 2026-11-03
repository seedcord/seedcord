export type ReadAsset = (path: string) => Promise<Response>;

const fetchPath: ReadAsset = (path) => fetch(path);

const withoutQuery = (path: string): string => path.replace(/\?.*$/, '');

export class SiteUnreachable extends Error {
    constructor(path: string, cause: TypeError) {
        super(`${withoutQuery(path)} failed to load because the request never reached the server`, { cause });
    }
}

async function requestReachingServer(path: string, read: ReadAsset): Promise<Response> {
    try {
        return await read(path);
    } catch (error) {
        // fetch rejects with a TypeError when the request never reaches the server
        if (error instanceof TypeError) throw new SiteUnreachable(path, error);
        throw error;
    }
}

export async function readAsset(path: string, read: ReadAsset = fetchPath): Promise<Response> {
    const response = await requestReachingServer(path, read);
    if (!response.ok) throw new Error(`${withoutQuery(path)} failed to load with status ${response.status}`);
    return response;
}

// every JSON file read here comes from this repo's own site builds and workers, written from the type Json
export async function readJson<Json>(path: string, read: ReadAsset = fetchPath): Promise<Json> {
    const response = await readAsset(path, read);
    return (await response.json()) as Json;
}
