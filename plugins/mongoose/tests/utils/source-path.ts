import path from 'node:path';

// absolute specifier for generated fixtures in temp dirs, where package aliases cannot resolve
export const pluginsPath = path.resolve(__dirname, '../../src/index').replaceAll('\\', '/');
