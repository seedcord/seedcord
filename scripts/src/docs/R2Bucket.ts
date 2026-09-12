import { readFile } from 'node:fs/promises';

import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';
import { validateIndex } from '@seedcord/docs-engine';
import { Converters, Envapter } from 'envapt';

import type { IndexJson } from '@seedcord/docs-engine';

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const HTTP_NOT_FOUND = 404;

export class R2Bucket {
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

    async delete(relativePath: string): Promise<void> {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.keyFor(relativePath) }));
    }

    async list(): Promise<string[]> {
        const paths: string[] = [];
        let token: string | undefined;

        do {
            const reply = await this.client.send(
                new ListObjectsV2Command({ Bucket: this.bucket, Prefix: this.prefix, ContinuationToken: token })
            );
            for (const object of reply.Contents ?? []) {
                if (object.Key) paths.push(object.Key.slice(this.prefix.length));
            }
            token = reply.IsTruncated ? reply.NextContinuationToken : undefined;
        } while (token);

        return paths;
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
