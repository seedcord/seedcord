import { readFile } from 'node:fs/promises';

import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';
import { Converters, Envapter } from 'envapt';

import { validateIndex } from '@seedcord/docs-engine';

import type { IndexJson } from '@seedcord/docs-engine';

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const HTTP_NOT_FOUND = 404;

export function cacheControlFor(relativePath: string): string {
    return relativePath === 'index.json' ? 'no-cache' : IMMUTABLE_CACHE_CONTROL;
}

export interface R2Config {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
}

export function r2ConfigFromEnv(bucketOverride?: string): R2Config {
    const bucket = bucketOverride?.trim();

    const read = (key: string): string => Envapter.getRequired(key, Converters.String);
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

// err.name varies by operation (NoSuchKey on GET, NotFound on HEAD), so trust the 404 status.
function isR2NotFound(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
    return (
        candidate.$metadata?.httpStatusCode === HTTP_NOT_FOUND ||
        candidate.name === 'NoSuchKey' ||
        candidate.name === 'NotFound'
    );
}

export interface RemoteRef {
    client: S3Client;
    bucket: string;
    prefix: string;
}

export async function fetchRemoteIndex(ref: RemoteRef): Promise<IndexJson | null> {
    try {
        const res = await ref.client.send(new GetObjectCommand({ Bucket: ref.bucket, Key: `${ref.prefix}index.json` }));
        const text = await res.Body?.transformToString();
        if (!text) return null;
        const parsed: unknown = JSON.parse(text);
        return validateIndex(parsed);
    } catch (error) {
        if (isR2NotFound(error)) return null;
        throw error;
    }
}

export async function objectExists(options: { client: S3Client; bucket: string; key: string }): Promise<boolean> {
    try {
        await options.client.send(new HeadObjectCommand({ Bucket: options.bucket, Key: options.key }));
        return true;
    } catch (error) {
        if (isR2NotFound(error)) return false;
        throw error;
    }
}

export async function listRemoteKeys(ref: RemoteRef): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;
    do {
        const res = await ref.client.send(
            new ListObjectsV2Command({ Bucket: ref.bucket, Prefix: ref.prefix, ContinuationToken: token })
        );
        for (const object of res.Contents ?? []) {
            if (object.Key) keys.push(object.Key);
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return keys;
}

export async function deleteFromR2(options: { client: S3Client; bucket: string; key: string }): Promise<void> {
    await options.client.send(new DeleteObjectCommand({ Bucket: options.bucket, Key: options.key }));
}
