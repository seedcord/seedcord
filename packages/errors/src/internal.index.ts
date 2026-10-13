export { SeedcordError, SeedcordTypeError, SeedcordRangeError, SeedcordAggregateError } from './SeedcordError';
export { throwSingleOrAggregate } from './throwSingleOrAggregate';

// these files don't exactly belong in this package but are here because there's no better place for them
export { BRAND, setColorLevel, WORDMARK } from './palette';
export { validateDiscordToken } from './validateDiscordToken';
export { applicationIdFromToken } from './applicationIdFromToken';
