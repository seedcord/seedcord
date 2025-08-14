import type { Handler } from '../../interfaces/Handler';

type HandlerCtor = new (...args: any[]) => Handler;

export function Checkable<TypeHandler extends HandlerCtor>(ctor: TypeHandler): TypeHandler {
  return class extends ctor {
    static override name = ctor.name;
    checkable = true as const;
  };
}
