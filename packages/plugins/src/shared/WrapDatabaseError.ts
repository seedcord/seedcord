import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Denial } from 'seedcord';

import { throwDatabaseError } from './throwDatabaseError';

/**
 * Catches and wraps database operation errors.
 *
 * Wraps non-Denial exceptions in DatabaseError instances
 * with UUID tracking. Should be applied to database service methods.
 *
 * @typeParam TypeReturn - The return type of the decorated method
 * @param errorMessage - Message to include when wrapping errors
 * @decorator
 * @example
 * ```typescript
 * class UserService extends MongoService<IUser> {
 *   \@WrapDatabaseError('Failed to find user')
 *   async findById(id: string) {
 *     return this.model.findById(id);
 *   }
 * }
 * ```
 *
 * @see {@link DatabaseError}
 * @see {@link Denial}
 * @see {@link MongoService}
 */
export function WrapDatabaseError<TypeReturn>(errorMessage: string) {
    return function (
        _target: unknown,
        _propertyKey: string,
        descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<TypeReturn>>
    ): void {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]): Promise<TypeReturn> {
            if (!originalMethod) {
                throw new SeedcordError(SeedcordErrorCode.DecoratorMethodNotFound);
            }

            try {
                return await originalMethod.apply(this, args);
            } catch (error) {
                if (!(error instanceof Denial)) {
                    throwDatabaseError(error, errorMessage);
                } else {
                    throw error;
                }
            }
        };
    };
}
