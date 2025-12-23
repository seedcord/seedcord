import seedcord from './bot';

export { seedcord as default, seedcord, Vars } from './bot';

await seedcord.start();

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
