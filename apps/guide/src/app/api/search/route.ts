import { createFromSource } from 'fumadocs-core/search/server';

import { source } from '#lib/source';

// next prerenders a route into a static export only when revalidate is false
export const revalidate = false;

// staticGET writes the whole index out as one file. GET would need a server to answer a query
export const { staticGET: GET } = createFromSource(source);
