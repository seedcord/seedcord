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
            `${String(issue.input)} is not in apps/home/src/lib/blog/authors.ts. Add your GitHub handle and name there.`
    }
);

const isoDate = z.iso.date({ error: (issue) => `${String(issue.input)} is not a date. Write it as YYYY-MM-DD.` });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types -- defineDocs infers the frontmatter type from the returned schema
export function postSchema({ path: postFile }: MacroSchemaContext) {
    const cover = z.object({ src: z.string(), alt: z.string().min(1) }).transform(({ src, alt }, context) => {
        const read = readPostImage(src, postFile);
        if (read.ok) return { ...read.image, alt };

        context.addIssue({ code: 'custom', path: ['src'], message: read.reason });
        return z.NEVER;
    });

    return pageSchema
        .extend({
            description: z.string().min(1),
            authors: z
                .array(authorHandle)
                .min(1)
                .superRefine((handles, context) => {
                    const repeated = handles.find((handle, at) => handles.indexOf(handle) !== at);
                    if (repeated === undefined) return;

                    context.addIssue({
                        code: 'custom',
                        message: `${repeated} is listed twice under authors. List each author once.`
                    });
                }),
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
