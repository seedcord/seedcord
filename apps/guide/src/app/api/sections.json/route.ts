import { allGuideSections } from '#lib/sections';

export const dynamic = 'force-static';

export function GET(): Response {
    return Response.json(allGuideSections());
}
