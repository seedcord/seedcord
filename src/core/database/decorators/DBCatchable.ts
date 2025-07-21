import { DatabaseError } from '../../../bot/errors/Database';
import { CustomError } from '../../../bot/interfaces/Components';
import { throwCustomError } from '../../library/Helpers';

export function DBCatchable<T>(errorMessage: string) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<T>>
  ): void {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<T> {
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
