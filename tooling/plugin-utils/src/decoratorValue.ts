import 'reflect-metadata';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

export function decoratorValue(key: symbol, decorator: string, Service: { readonly name: string }): string {
    const value: unknown = Reflect.getMetadata(key, Service);
    if (typeof value !== 'string') {
        throw new SeedcordTypeError(SeedcordErrorCode.PluginServiceDecoratorMissing, [decorator, Service.name]);
    }
    return value;
}
