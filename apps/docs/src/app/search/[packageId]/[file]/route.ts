import { loadDocsCatalog } from '#lib/docs/catalog';
import { searchIndexFor } from '#lib/search/buildIndex';
import { searchFileName, versionFromFile } from '#lib/search/files';

export const dynamic = 'force-static';

interface SearchFileParams {
    packageId: string;
    file: string;
}

export async function generateStaticParams(): Promise<SearchFileParams[]> {
    const catalog = await loadDocsCatalog();
    return catalog.flatMap((entry) =>
        entry.versions.map((version) => ({ packageId: entry.id, file: searchFileName(version.id) }))
    );
}

export async function GET(_req: Request, { params }: { params: Promise<SearchFileParams> }): Promise<Response> {
    const { packageId, file } = await params;
    const version = versionFromFile(file);
    const entries = version === undefined ? null : await searchIndexFor(packageId, version);
    return entries === null ? Response.json([], { status: 404 }) : Response.json(entries);
}
