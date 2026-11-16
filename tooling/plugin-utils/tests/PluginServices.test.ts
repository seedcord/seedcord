import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { describe, expect, vi } from 'vite-plus/test';

import { PluginServices } from '#src/PluginServices';
import { it } from '#src/testing';

import { Service, ServiceKey } from './fixtures/services';

// absolute because the #src alias doesn't resolve from the temp folder that each test writes to
const fixturesPath = path.resolve(__dirname, 'fixtures/services').replaceAll('\\', '/');

const serviceSource = (key: string, className = 'Users'): string => `
import { RegisterService, Service } from '${fixturesPath}';

@RegisterService('${key}')
export class ${className} extends Service {}
`;

function servicesIn(dir: string): PluginServices<new () => Service, Record<string, Service>> {
    return new PluginServices({
        pluginName: 'Test',
        dir,
        logger: new Logger('PluginServices'),
        base: Service,
        metadataKey: ServiceKey,
        decorator: '@RegisterService',
        create: (Ctor) => new Ctor()
    });
}

describe('PluginServices', () => {
    it('loads each decorated class under its key, and codegen reads the same keys without loading', async ({
        testEnv
    }) => {
        await testEnv.createFile('services/Users.ts', serviceSource('users'));
        const services = servicesIn(testEnv.resolvePath('services'));

        const { services: found } = await services.codegen();
        expect(found.users?.name).toBe('Users');
        expect(() => services.map).toThrow(expect.objectContaining({ code: SeedcordErrorCode.PluginServicesNotReady }));

        await services.load();
        expect(services.map.users?.className).toBe('Users');
    });

    it('warns once about an exported class without the decorator and ignores the other exports', async ({
        testEnv
    }) => {
        using warn = vi.spyOn(Logger.prototype, 'warn');
        await testEnv.createFile(
            'services/Plain.ts',
            `
            import { Service } from '${fixturesPath}';

            export class Plain extends Service {}
            export const LIMIT = 5;
            `
        );
        await testEnv.createFile('services/index.ts', "export { Plain } from './Plain';");
        const services = servicesIn(testEnv.resolvePath('services'));

        await services.load();

        expect(warn.mock.calls.map(([message]) => message)).toEqual([expect.stringContaining('Plain')]);
        expect(services.map).toEqual({});
    });

    it('moves a service to its new key when a save changes the decorator', async ({ testEnv }) => {
        const file = await testEnv.createFile('services/Users.ts', serviceSource('users'));
        await testEnv.createFile('services/Products.ts', serviceSource('products', 'Products'));
        const services = servicesIn(testEnv.resolvePath('services'));
        await services.load();

        await testEnv.createFile('services/Users.ts', serviceSource('admins'));
        await services.handle({ file, type: 'update' });

        expect(Object.keys(services.map).sort()).toEqual(['admins', 'products']);
    });

    it('keeps the last good service when a saved file fails to import', async ({ testEnv }) => {
        const file = await testEnv.createFile('services/Users.ts', serviceSource('users'));
        const services = servicesIn(testEnv.resolvePath('services'));
        await services.load();

        await testEnv.createFile('services/Users.ts', 'export const broken = {{{ not valid');
        await services.handle({ file, type: 'update' });

        expect(services.map).toHaveProperty('users');
    });

    it('removes the services from a failed load before the retry', async ({ testEnv }) => {
        // files load sorted by path. AUsers registers before ZBroken stops the load
        await testEnv.createFile('services/AUsers.ts', serviceSource('users', 'AUsers'));
        await testEnv.createFile('services/ZBroken.ts', 'export const broken = {{{ not valid');
        const services = servicesIn(testEnv.resolvePath('services'));
        await expect(services.load()).rejects.toThrow();

        await testEnv.removeFile('services/AUsers.ts');
        await testEnv.createFile('services/ZBroken.ts', serviceSource('products', 'ZProducts'));
        await services.load();

        expect(Object.keys(services.map)).toEqual(['products']);
    });
});
