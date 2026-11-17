export { SeedcordError, SeedcordTypeError, SeedcordRangeError, SeedcordAggregateError } from './SeedcordError';
export { throwSingleOrAggregate } from './throwSingleOrAggregate';
export type { SeedcordErrorArguments } from './ErrorMessages';
export { token, type VitePluginPlace } from './messageParts';

// these files don't exactly belong in this package but are here because they don't fit any other package better
export { setColorLevel, WORDMARK } from './palette';
export { displayPath } from './displayPath';
export { isSnowflake } from './isSnowflake';
export { BOT_TOKEN_KEYS } from './botTokenKeys';
export { validateDiscordToken, type BotToken } from './validateDiscordToken';
