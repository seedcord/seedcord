export { SeedcordError, SeedcordTypeError, SeedcordRangeError, SeedcordAggregateError } from './SeedcordError';
export { throwSingleOrAggregate } from './throwSingleOrAggregate';
export type { SeedcordErrorArguments } from './ErrorMessages';
export type { VitePluginPlace } from './messageParts';

// these files don't exactly belong in this package but are here because there's no better place for them
export { BRAND, setColorLevel, WORDMARK } from './palette';
export { displayPath } from './displayPath';
export { isSnowflake } from './isSnowflake';
export { validateDiscordToken, type BotToken } from './validateDiscordToken';
