import { Buffer, isUtf8 } from 'node:buffer';

// how a built bot carries one listed file inside its JS
export interface EncodedFile {
    readonly encoding: 'utf8' | 'base64';
    readonly data: string;
}

export function encodeFile(bytes: Buffer): EncodedFile {
    return isUtf8(bytes)
        ? { encoding: 'utf8', data: bytes.toString('utf8') }
        : { encoding: 'base64', data: bytes.toString('base64') };
}

// the reverse of encodeFile
export function decodeFile({ encoding, data }: EncodedFile): Buffer {
    return Buffer.from(data, encoding);
}
