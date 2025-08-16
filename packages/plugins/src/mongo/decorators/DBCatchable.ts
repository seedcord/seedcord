import { CustomError, throwCustomError, DatabaseError } from 'seedcord';

/**
 * Catches and wraps database operation errors.
 *
 * Automatically wraps non-CustomError exceptions in DatabaseError instances
 * with UUID tracking. Should be applied to database service methods.
 *
 * @param errorMessage - Message to include when wrapping errors
 * @decorator
 * @example
 * ```typescript
 * class UserService extends BaseService {
 *   \@DBCatchable('Failed to find user')
 *   async findById(id: string) {
 *     return this.model.findById(id);
 *   }
 * }
 * ```
 */
export function DBCatchable<TypeReturn>(errorMessage: string) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<TypeReturn>>
  ): void {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<TypeReturn> {
      if (!originalMethod) {
        throw new Error('Method not found');
      }

      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (!(error instanceof CustomError)) {
          throwCustomError(error, errorMessage, DatabaseError);
        } else {
          throw error;
        }
      }
    };
  };
}
