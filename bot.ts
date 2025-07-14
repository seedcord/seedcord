import 'reflect-metadata';

import { CoreBot } from './src/core/CoreBot';

async function main() {
  await new CoreBot().start();
}

main().catch(console.error);
