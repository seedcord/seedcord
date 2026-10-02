import { getDocsEngine } from '#lib/docs/engine';

export const dynamic = 'force-static';

// the docs worker reads this to send an old patch to the head of its line
export async function GET(): Promise<Response> {
    return Response.json(await (await getDocsEngine()).ready());
}
