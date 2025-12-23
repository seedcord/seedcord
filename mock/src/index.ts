import seedcord from './bot';

await seedcord.start();

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
