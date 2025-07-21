import type { Handler } from '../interfaces/Handler';

type HandlerCtor = new (...args: any[]) => Handler;

export function Checkable<T extends HandlerCtor>(ctor: T): T {
  return class extends ctor {
    static override name = ctor.name;
    checkable = true as const;
  };
}
