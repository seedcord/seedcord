import 'reflect-metadata';

export const ServiceKey = Symbol('test:service');

export abstract class Service {
    public readonly className = this.constructor.name;
}

export function RegisterService(key: string) {
    return (ctor: abstract new () => Service): void => {
        Reflect.defineMetadata(ServiceKey, key, ctor);
    };
}
