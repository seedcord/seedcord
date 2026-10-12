import seedcord from './bot';

await seedcord.start();

console.log(`fixture:listening ${String(seedcord.port)}`);
