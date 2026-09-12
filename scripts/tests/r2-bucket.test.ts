import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { R2Bucket } from '#src/docs/R2Bucket';

import type { S3Client } from '@aws-sdk/client-s3';
import type { IndexJson } from '@seedcord/docs-engine';

interface SentCommand {
    name: string;
    input: Record<string, unknown>;
}

const indexJson: IndexJson = {
    schemaVersion: 1,
    updatedAt: '2026-09-11T02:05:04.667Z',
    pathTemplates: {
        stable: 'packages/{name}/releases/{version}/project.json',
        prerelease: 'packages/{name}/prerelease/{version}/project.json'
    },
    packages: {
        utils: {
            fullName: '@seedcord/utils',
            stable: { latest: '1.3.2', latestByMinor: { '0.2': '0.2.4' }, latestByMajor: { '1': '1.3.2' } },
            prerelease: { latest: '2.0.0-alpha.1' }
        }
    }
};

const notFound = Object.assign(new Error('missing'), { $metadata: { httpStatusCode: 404 } });

function stub(...replies: (object | Error)[]): { sent: SentCommand[]; client: S3Client } {
    const sent: SentCommand[] = [];
    let next = 0;

    const send = (command: { constructor: { name: string }; input: Record<string, unknown> }): Promise<object> => {
        sent.push({ name: command.constructor.name, input: command.input });
        const reply = replies[next] ?? {};
        next += 1;
        return Error.isError(reply) ? Promise.reject(reply) : Promise.resolve(reply);
    };

    // fixture cast: R2Bucket only ever calls send()
    return { sent, client: { send } as unknown as S3Client };
}

const body = (text: string): object => ({ Body: { transformToString: (): Promise<string> => Promise.resolve(text) } });

describe('R2Bucket index', () => {
    it('reads and validates the index under its prefix', async () => {
        const { sent, client } = stub(body(JSON.stringify(indexJson)));

        await expect(new R2Bucket(client, 'docs', 'preview/').getIndex()).resolves.toEqual(indexJson);
        expect(sent[0]?.name).toBe('GetObjectCommand');
        expect(sent[0]?.input.Key).toBe('preview/index.json');
        expect(sent[0]?.input.Bucket).toBe('docs');
    });

    it('reads null when the index is absent', async () => {
        const { client } = stub(notFound);

        await expect(new R2Bucket(client, 'docs').getIndex()).resolves.toBeNull();
    });

    it('rethrows an error that is not a missing object', async () => {
        const { client } = stub(new Error('network down'));

        await expect(new R2Bucket(client, 'docs').getIndex()).rejects.toThrow(/network down/);
    });
});

describe('R2Bucket objects', () => {
    it('answers whether an object exists', async () => {
        const present = stub({});
        await expect(new R2Bucket(present.client, 'docs', 'preview/').exists('index.json')).resolves.toBe(true);
        expect(present.sent[0]?.name).toBe('HeadObjectCommand');
        expect(present.sent[0]?.input.Key).toBe('preview/index.json');

        const absent = stub(notFound);
        await expect(new R2Bucket(absent.client, 'docs').exists('index.json')).resolves.toBe(false);
    });

    it('uploads a file under the prefix', async () => {
        const { sent, client } = stub({});
        const file = path.join(process.cwd(), 'package.json');

        await new R2Bucket(client, 'docs', 'preview/').put('packages/core/releases/0.7.0/project.json', file);

        expect(sent[0]?.name).toBe('PutObjectCommand');
        expect(sent[0]?.input.Key).toBe('preview/packages/core/releases/0.7.0/project.json');
        expect(sent[0]?.input.ContentType).toBe('application/json');
        expect(Buffer.isBuffer(sent[0]?.input.Body)).toBe(true);
    });

    it('marks a version file immutable and keeps the index fresh', async () => {
        const file = path.join(process.cwd(), 'package.json');

        const version = stub({});
        await new R2Bucket(version.client, 'docs').put('packages/core/releases/0.7.0/project.json', file);
        expect(version.sent[0]?.input.CacheControl).toBe('public, max-age=31536000, immutable');

        const root = stub({});
        await new R2Bucket(root.client, 'docs', 'preview/').put('index.json', file);
        expect(root.sent[0]?.input.CacheControl).toBe('no-cache');
    });

    it('deletes an object under the prefix', async () => {
        const { sent, client } = stub({});

        await new R2Bucket(client, 'docs', 'preview/').delete('packages/core/releases/0.7.0/api.json');

        expect(sent[0]?.name).toBe('DeleteObjectCommand');
        expect(sent[0]?.input.Key).toBe('preview/packages/core/releases/0.7.0/api.json');
    });
});

describe('R2Bucket listing', () => {
    it('follows the continuation token and returns paths without the prefix', async () => {
        const { sent, client } = stub(
            { Contents: [{ Key: 'preview/index.json' }], IsTruncated: true, NextContinuationToken: 'more' },
            { Contents: [{ Key: 'preview/packages/core/releases/0.7.0/project.json' }], IsTruncated: false }
        );

        const keys = await new R2Bucket(client, 'docs', 'preview/').list();

        expect(keys).toEqual(['index.json', 'packages/core/releases/0.7.0/project.json']);
        expect(sent).toHaveLength(2);
        expect(sent[0]?.input.Prefix).toBe('preview/');
        expect(sent[1]?.input.ContinuationToken).toBe('more');
    });
});
