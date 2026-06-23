import { loadDocsCatalog } from '@lib/docs/catalog';
import { GUIDE_URL, REPO_URL, SITE_DESCRIPTION, SITE_NAME, canonicalUrl } from '@lib/site';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
    const catalog = await loadDocsCatalog();

    const packageLines = catalog.map((pkg) => {
        const latest = pkg.versions.find((version) => version.isLatest) ?? pkg.versions[0];
        const url = canonicalUrl(`/packages/${pkg.id}/${latest?.id ?? 'latest'}`);
        return `- [${pkg.label}](${url})`;
    });

    const body = [
        `# ${SITE_NAME}`,
        '',
        `> ${SITE_DESCRIPTION}`,
        '',
        '## Packages',
        '',
        ...packageLines,
        '',
        '## Links',
        '',
        `- [Guide](${GUIDE_URL})`,
        `- [GitHub](${REPO_URL})`,
        ''
    ].join('\n');

    return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
