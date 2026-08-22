import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';

const dev = defineDocs({ dir: 'content/dev' });

export const devSource = loader({
    baseUrl: '/dev',
    source: dev.toFumadocsSource()
});
