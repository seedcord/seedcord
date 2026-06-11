import { cn, tw } from '@seedcord/ui';

import type { ReactElement } from 'react';

const readmeProseClassName = [
    tw`min-w-0 text-base/relaxed text-(--text-muted)`,
    tw`[&_h1]:mt-0 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-(--text)`,
    tw`[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-(--text)`,
    tw`[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-(--text)`,
    tw`[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-(--text)`,
    tw`[&_p]:my-3 [&_p]:leading-relaxed`,
    tw`[&_strong]:font-semibold [&_strong]:text-(--text)`,
    tw`[&_a]:text-(--accent-b) [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:opacity-80`,
    tw`[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6`,
    tw`[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6`,
    tw`[&_li]:leading-relaxed`,
    tw`[&_code]:rounded [&_code]:bg-(--surface-subtle) [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]`,
    tw`[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-(--border) [&_pre]:bg-(--surface-subtle) [&_pre]:p-4 [&_pre]:text-xs`,
    tw`[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit`,
    tw`[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-(--border) [&_blockquote]:pl-4 [&_blockquote]:italic`,
    tw`[&_hr]:my-6 [&_hr]:border-(--border)`,
    tw`[&_img]:mx-auto [&_img]:my-4 [&_img]:block [&_img]:w-full [&_img]:max-w-lg [&_img]:rounded-md`,
    tw`[&_table]:my-4 [&_table]:w-full [&_table]:text-left`,
    tw`[&_th]:border-b [&_th]:border-(--border) [&_th]:py-1 [&_th]:pr-4 [&_th]:font-semibold [&_th]:text-(--text)`,
    tw`[&_td]:border-b [&_td]:border-(--border) [&_td]:py-1 [&_td]:pr-4`
].join(' ');

interface ReadmeBlockProps {
    html: string;
    className?: string;
}

export function ReadmeBlock({ html, className }: ReadmeBlockProps): ReactElement {
    return <div className={cn(readmeProseClassName, className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
