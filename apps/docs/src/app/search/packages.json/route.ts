import { searchPackages } from '#lib/search/buildIndex';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
    return Response.json(await searchPackages());
}
