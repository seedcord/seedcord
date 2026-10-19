import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod/v4';

import { AUTHORS_BY_HANDLE } from './authors';
import { readPostImage } from './postFiles';

import type { AuthorHandle } from './authors';
import type { MacroSchemaContext } from 'fumadocs-mdx/macro';

const authorHandle = z.custom<AuthorHandle>(
    (value) => typeof value === 'string' && Object.hasOwn(AUTHORS_BY_HANDLE, value),
    {
        error: (issue) =>
            `${String(issue.input)} is not in src/lib/blog/authors.ts. Add your GitHub handle and name there.`
    }
);

const isoDate = z.iso.date({ error: (issue) => `${String(issue.input)} is not a date. Write it as YYYY-MM-DD.` });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types -- defineDocs infers the frontmatter type from the returned schema
export function postSchema({ path: postFile }: MacroSchemaContext) {
    const cover = z.object({ src: z.string(), alt: z.string().min(1) }).transform(({ src, alt }, context) => {
        const image = readPostImage(src, postFile);
        if (typeof image !== 'string') return { ...image, alt };

        context.addIssue({ code: 'custom', path: ['src'], message: image });
        return z.NEVER;
    });

    return pageSchema
        .extend({
            description: z.string().min(1),
            authors: z
                .array(authorHandle)
                .min(1)
                .refine(
                    (handles) => new Set(handles).size === handles.length,
                    'An author is listed twice. List each once.'
                ),
            created: isoDate,
            edited: isoDate.optional(),
            cover: cover.optional(),
            unlisted: z.boolean().default(false)
        })
        .superRefine(({ created, edited }, context) => {
            if (edited === undefined || edited > created) return;

            context.addIssue({
                code: 'custom',
                path: ['edited'],
                message: `edited (${edited}) is not after created (${created}). Set edited to the date of your last change, or remove it.`
            });
        });
}
