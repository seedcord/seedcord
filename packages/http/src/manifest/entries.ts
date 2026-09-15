import { Subscriber } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { InteractionHandler } from '#handlers/interaction/InteractionHandler';
import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { StoredSubscriberCtor } from '@seedcord/core/internal';

// a gateway class carries the same core metadata. its base class differs.
export function isHandlerClass(value: unknown): value is HandlerConstructor {
    if (typeof value !== 'function') return false;
    return value.prototype instanceof InteractionHandler || value.prototype instanceof AutocompleteHandler;
}

export function isMiddlewareClass(value: unknown): value is InteractionMiddlewareConstructor {
    return typeof value === 'function' && value.prototype instanceof InteractionMiddleware;
}

export function isSubscriberClass(value: unknown): value is StoredSubscriberCtor {
    return typeof value === 'function' && value.prototype instanceof Subscriber;
}

export function wrongClass(array: string, value: unknown, base: string): SeedcordTypeError {
    const name = typeof value === 'function' ? value.name : String(value);
    return new SeedcordTypeError(SeedcordErrorCode.ManifestEntryWrongClass, [array, name, base]);
}

export function noRoutes(array: string, className: string, decorator: string): SeedcordError {
    return new SeedcordError(SeedcordErrorCode.ManifestEntryNoRoutes, [array, className, decorator]);
}
