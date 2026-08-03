export { TypedEventEmitter } from './TypedEventEmitter';
export { WaitForError } from './WaitForError';
export type { EventMap, NoEvents, WaitForOptions } from './types';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
