import { Subscriber } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { Bus } from '@seedcord/core';
import type { StoredSubscriberCtor, SubscriberRegistration } from '@seedcord/core/internal';
import type { RouteManifest } from '@src/manifest/RouteManifest';

/**
 * Registers a manifest's subscribers on the bus without importing them. Each row's module loads on
 * the first publish of one of its keys, which keeps an isolate that never publishes free of the cost.
 *
 * @internal
 */
export function registerSubscribers(bus: Bus, manifest: RouteManifest): void {
    for (const row of manifest.subscriberRoutes) {
        bus.register({
            keys: row.keys,
            frequency: row.frequency,
            resolve: async () => {
                const keys = row.keys.join(', ');
                let module: Awaited<ReturnType<typeof row.load>>;
                try {
                    module = await row.load();
                } catch (caught) {
                    throw new SeedcordError(SeedcordErrorCode.RouteModuleLoadFailed, [keys, row.from], {
                        cause: caught
                    });
                }
                if (!Object.hasOwn(module, row.exportName)) {
                    throw new SeedcordError(SeedcordErrorCode.InteractionRouteExportMissing, [
                        keys,
                        row.exportName,
                        row.from
                    ]);
                }

                // the same shape the node loader requires, a hand-authored manifest reaches here too
                const exported = module[row.exportName];
                if (typeof exported !== 'function' || !(exported.prototype instanceof Subscriber)) {
                    throw new SeedcordError(SeedcordErrorCode.SubscriberRouteNotASubscriber, [
                        keys,
                        row.exportName,
                        row.from
                    ]);
                }
                return exported as StoredSubscriberCtor;
            }
        } satisfies SubscriberRegistration);
    }
}
