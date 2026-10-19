interface TwinDocument {
    title: string;
    description?: string | undefined;
    byline?: string | undefined;
    body: string;
}

// the markdown copy of a page, served next to it as index.md
export function twinDocument({ title, description, byline, body }: TwinDocument): string {
    const head = [`# ${title}`, description, byline].filter((part) => part !== undefined).join('\n\n');
    return `${head}\n\n${body.replace(/^\n+/, '')}`;
}
