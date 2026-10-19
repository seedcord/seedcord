import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod/v4';

import { AUTHORS } from './authors';
import { readPostImage } from './postImages';

import type { AuthorHandle } from './authors';

interface SchemaContext {
    path: string;
    source: string;
}

const HANDLES = Object.keys(AUTHORS) as [AuthorHandle, ...AuthorHandle[]];

const isoDate = z.iso.date({ error: (issue) => `${String(issue.input)} is not a date. Write it as YYYY-MM-DD.` });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types -- the collection reads the zod type this infers
export function postSchema({ path: postPath }: SchemaContext) {
    const cover = z.object({ src: z.string(), alt: z.string().min(1) }).transform(({ src, alt }, context) => {
        const image = readPostImage(src, postPath);
        if (typeof image !== 'string') return { ...image, alt };

        context.addIssue({ code: 'custom', path: ['src'], message: image });
        return z.NEVER;
    });

    return pageSchema
        .extend({
            description: z.string().min(1),
            authors: z
                .array(
                    z.enum(HANDLES, {
                        error: (issue) =>
                            `${String(issue.input)} is not in src/lib/blog/authors.ts. Add your GitHub handle and name there.`
                    })
                )
                .min(1),
            created: isoDate,
            edited: isoDate.optional(),
            cover: cover.optional(),
            unlisted: z.boolean().default(false)
        })
        .superRefine(({ created, edited }, context) => {
            if (edited === undefined || edited >= created) return;

            context.addIssue({
                code: 'custom',
                path: ['edited'],
                message: `edited (${edited}) is before created (${created}).`
            });
        });
}
