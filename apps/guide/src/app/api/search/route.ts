import { createFromSource } from 'fumadocs-core/search/server';

import { source } from '#lib/source';

// a static export prerenders a route only when it says it never revalidates
export const revalidate = false;

// staticGET writes the whole index out as one file. GET would need a server to answer a query
export const { staticGET: GET } = createFromSource(source);
