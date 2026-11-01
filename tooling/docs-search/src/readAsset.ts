export type ReadAsset = (path: string) => Promise<Response>;

export async function readAsset(read: ReadAsset, path: string): Promise<Response> {
    const response = await read(path);
    if (!response.ok) throw new Error(`${path} failed to load with status ${response.status}`);
    return response;
}

// every JSON file read here comes from this repo's guide build or guide worker, written from the type Json
export async function readJson<Json>(read: ReadAsset, path: string): Promise<Json> {
    const response = await readAsset(read, path);
    return (await response.json()) as Json;
}
