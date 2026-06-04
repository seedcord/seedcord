import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Converters, Envapter } from 'envapt';

// Shared helpers for publishing the docs artifact tree (generated/artifacts/) to Cloudflare R2

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export function cacheControlFor(relativePath: string): string {
    return relativePath === 'index.json' ? 'no-cache' : IMMUTABLE_CACHE_CONTROL;
}

// include api.json in case engine changes later so we can regenerate project.json from it
export function servedFiles(files: readonly string[]): string[] {
    return files.filter(
        (file) => file === 'index.json' || file.endsWith('/project.json') || file.endsWith('/api.json')
    );
}

export async function listFiles(root: string, base: string = root): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const full = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listFiles(full, base)));
        } else {
            files.push(path.relative(base, full).split(path.sep).join('/'));
        }
    }
    return files.sort();
}

export interface R2Config {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
}

export function r2ConfigFromEnv(bucketOverride?: string): R2Config {
    const bucket = bucketOverride?.trim();

    const read = (key: string): string => Envapter.getUsing(key, { converter: Converters.String, required: true });
    return {
        accountId: read('R2_ACCOUNT_ID'),
        accessKeyId: read('R2_ACCESS_KEY_ID'),
        secretAccessKey: read('R2_SECRET_ACCESS_KEY'),
        bucket: bucket ?? read('R2_BUCKET')
    };
}

export function createR2Client(config: R2Config): S3Client {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
    });
}

export interface PutToR2Options {
    client: S3Client;
    bucket: string;
    key: string;
    filePath: string;
    cacheControl: string;
}

// Every served artifact is JSON; no caller needs to override the content type.
export async function putToR2(options: PutToR2Options): Promise<void> {
    const body = await readFile(options.filePath);
    await options.client.send(
        new PutObjectCommand({
            Bucket: options.bucket,
            Key: options.key,
            Body: body,
            ContentType: 'application/json',
            CacheControl: options.cacheControl
        })
    );
}
