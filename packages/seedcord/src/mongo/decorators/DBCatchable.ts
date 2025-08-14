import { DatabaseError } from '../../bot/errors/Database';
import { CustomError } from '../../interfaces/Components';
import { throwCustomError } from '../../library/Helpers';

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
