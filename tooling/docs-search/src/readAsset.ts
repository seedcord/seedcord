export type ReadAsset = (path: string) => Promise<Response>;

const fetchPath: ReadAsset = (path) => fetch(path);

export async function readAsset(path: string, read: ReadAsset = fetchPath): Promise<Response> {
    const response = await read(path);
    if (!response.ok) throw new Error(`${path} failed to load with status ${response.status}`);
    return response;
}

// every JSON file read here comes from this repo's own site builds and workers, written from the type Json
export async function readJson<Json>(path: string, read: ReadAsset = fetchPath): Promise<Json> {
    const response = await readAsset(path, read);
    return (await response.json()) as Json;
}
