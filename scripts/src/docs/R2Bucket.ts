import { readFile } from 'node:fs/promises';

import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';
import { validateIndex } from '@seedcord/docs-engine';
import { Converters, Envapter } from 'envapt';

import type { SiteBucket } from '#src/docs/DocsSiteUpload';
import type { ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import type { IndexJson } from '@seedcord/docs-engine';

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const HTTP_NOT_FOUND = 404;
// the S3 DeleteObjects call takes at most 1000 keys
const DELETE_BATCH = 1000;

export class R2Bucket implements SiteBucket {
    static fromEnv(bucketOverride?: string, prefix = ''): R2Bucket {
        const read = (key: string): string => Envapter.getRequired(key, Converters.String);
        const accountId = read('R2_ACCOUNT_ID');

        const client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: read('R2_ACCESS_KEY_ID'),
                secretAccessKey: read('R2_SECRET_ACCESS_KEY')
            }
        });

        const override = bucketOverride?.trim();

        return new R2Bucket(client, override === undefined || override === '' ? read('R2_BUCKET') : override, prefix);
    }

    constructor(
        private readonly client: S3Client,
        private readonly bucket: string,
        private readonly prefix = ''
    ) {}

    async getIndex(): Promise<IndexJson | null> {
        try {
            const reply = await this.client.send(
                new GetObjectCommand({ Bucket: this.bucket, Key: this.keyFor('index.json') })
            );
            const text = await reply.Body?.transformToString();
            if (!text) return null;

            const parsed: unknown = JSON.parse(text);
            return validateIndex(parsed);
        } catch (error) {
            if (isMissing(error)) return null;
            throw error;
        }
    }

    async exists(relativePath: string): Promise<boolean> {
        try {
            await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.keyFor(relativePath) }));
            return true;
        } catch (error) {
            if (isMissing(error)) return false;
            throw error;
        }
    }

    async put(relativePath: string, filePath: string): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: this.keyFor(relativePath),
                Body: await readFile(filePath),
                ContentType: 'application/json',
                CacheControl: relativePath === 'index.json' ? 'no-cache' : IMMUTABLE_CACHE_CONTROL
            })
        );
    }

    // the docs worker sets every response header itself
    async putFile(relativePath: string, filePath: string): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: this.keyFor(relativePath),
                Body: await readFile(filePath)
            })
        );
    }

    async delete(relativePath: string): Promise<void> {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.keyFor(relativePath) }));
    }

    async deleteFolder(folder: string): Promise<void> {
        const keys: string[] = [];
        for await (const page of this.pages(this.keyFor(folder))) {
            for (const object of page.Contents ?? []) if (object.Key) keys.push(object.Key);
        }

        for (let start = 0; start < keys.length; start += DELETE_BATCH) {
            const Objects = keys.slice(start, start + DELETE_BATCH).map((Key) => ({ Key }));
            await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects } }));
        }
    }

    async list(): Promise<string[]> {
        const paths: string[] = [];
        for await (const page of this.pages(this.prefix)) {
            for (const object of page.Contents ?? []) {
                if (object.Key) paths.push(object.Key.slice(this.prefix.length));
            }
        }
        return paths;
    }

    // the folders one level below `prefix`, each ending in a slash
    async folders(prefix: string): Promise<string[]> {
        const folders: string[] = [];
        for await (const page of this.pages(this.keyFor(prefix), '/')) {
            for (const common of page.CommonPrefixes ?? []) {
                if (common.Prefix) folders.push(common.Prefix.slice(this.prefix.length));
            }
        }
        return folders;
    }

    private async *pages(prefix: string, delimiter?: string): AsyncGenerator<ListObjectsV2CommandOutput> {
        let token: string | undefined;
        do {
            const page = await this.client.send(
                new ListObjectsV2Command({
                    Bucket: this.bucket,
                    Prefix: prefix,
                    Delimiter: delimiter,
                    ContinuationToken: token
                })
            );
            yield page;
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (token);
    }

    private keyFor(relativePath: string): string {
        return `${this.prefix}${relativePath}`;
    }
}

// the error name varies by operation (NoSuchKey on GET, NotFound on HEAD)
function isMissing(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;

    const candidate = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
    return (
        candidate.$metadata?.httpStatusCode === HTTP_NOT_FOUND ||
        candidate.name === 'NoSuchKey' ||
        candidate.name === 'NotFound'
    );
}
