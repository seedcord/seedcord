import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';

import { TWIN_OPTIONS } from './twin';

// a shallow clone dates every page the same because lastModified reads git log
const docs = defineDocs({
    dir: 'content/docs',
    docs: { lastModified: true, postprocess: { includeProcessedMarkdown: TWIN_OPTIONS } }
});

export const source = loader({
    baseUrl: '/',
    source: docs.toFumadocsSource()
});
