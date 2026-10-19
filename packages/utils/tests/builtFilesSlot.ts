import { BUILT_FILES_KEY } from '#src/node/directory/slots';

export function clearBuiltFiles(): void {
    Reflect.deleteProperty(globalThis, Symbol.for(BUILT_FILES_KEY));
}
