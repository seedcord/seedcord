import { isCancel } from '@clack/prompts';

class Cancelled extends Error {
    constructor() {
        super('Cancelled.');
        this.name = 'Cancelled';
    }
}

// clack signals a cancel with a symbol
export function requireAnswer<Value>(value: Value | symbol): Value {
    if (isCancel(value)) throw new Cancelled();
    return value;
}
