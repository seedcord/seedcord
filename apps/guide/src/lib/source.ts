import { loader } from 'fumadocs-core/source';
import { metaSchema } from 'fumadocs-core/source/schema';
import { defineDocs } from 'fumadocs-mdx/macro';
import { z } from 'zod/v4';

import { TWIN_OPTIONS } from './twin';

// a shallow clone dates every page the same because lastModified reads git log
const docs = defineDocs({
    dir: 'content/docs',
    docs: { lastModified: true, postprocess: { includeProcessedMarkdown: TWIN_OPTIONS } },
    // separator names whose sidebar group are closed by default
    meta: { schema: metaSchema.extend({ closed: z.array(z.string()).optional() }) }
});

export const source = loader({
    baseUrl: '/',
    source: docs.toFumadocsSource()
});
