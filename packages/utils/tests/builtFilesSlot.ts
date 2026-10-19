import { BOT_FILES_KEY, BUILT_FILES_READY_KEY } from '#src/files/slots';

export function clearBuiltFiles(): void {
    Reflect.deleteProperty(globalThis, Symbol.for(BOT_FILES_KEY));
    Reflect.deleteProperty(globalThis, Symbol.for(BUILT_FILES_READY_KEY));
}
