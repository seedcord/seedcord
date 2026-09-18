import { assetPath, publicPath, TWIN } from '#lib/pageAssets';
import { canonicalUrl, REPO_URL, SITE_NAME } from '#lib/site';

// pull requests merge into next
const CONTENT_SOURCE = `${REPO_URL}/edit/next/apps/guide/content/docs`;

interface PageActionSource {
    title: string;
    markdownUrl: string;
    contentPath: string;
}

export interface PageActionLinks {
    chatgpt: string;
    claude: string;
    cursor: string;
    edit: string;
    report: string;
}

function issueBody(page: PageActionSource): string {
    return [`Page: ${page.markdownUrl}`, '', 'What is wrong with it:', ''].join('\n');
}

export interface GuidePage {
    url: string;
    path: string;
    data: { title: string };
}

export interface PageActionProps {
    copySource: string;
    viewHref: string;
    links: PageActionLinks;
}

// the fetch goes straight at the file. the menu link goes through worker.ts
export function pageActionsFor(page: GuidePage): PageActionProps {
    return {
        copySource: assetPath(page.url, TWIN),
        viewHref: publicPath(page.url, TWIN),
        links: pageActionLinks({
            title: page.data.title,
            markdownUrl: canonicalUrl(publicPath(page.url, TWIN)),
            contentPath: page.path
        })
    };
}

function pageActionLinks(page: PageActionSource): PageActionLinks {
    const prompt = `Read ${page.markdownUrl}. I want to ask questions about it.`;

    return {
        chatgpt: `https://chatgpt.com/?${new URLSearchParams({ prompt, hints: 'search' }).toString()}`,
        claude: `https://claude.ai/new?${new URLSearchParams({ q: prompt }).toString()}`,
        cursor: `https://cursor.com/link/prompt?${new URLSearchParams({ text: prompt }).toString()}`,
        edit: `${CONTENT_SOURCE}/${page.contentPath}`,
        report: `${REPO_URL}/issues/new?${new URLSearchParams({
            title: `${SITE_NAME}: ${page.title}`,
            body: issueBody(page)
        }).toString()}`
    };
}
