import { Subscriber } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { RouteManifest } from '#src/manifest/RouteManifest';
import type { Bus } from '@seedcord/core';
import type { StoredSubscriberCtor, SubscriberRegistration } from '@seedcord/core/internal';

// an idle isolate that never publishes pays nothing for this
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

                // a hand-authored manifest reaches here too, so the check cannot rest on codegen
                const exported = module[row.exportName];
                if (typeof exported !== 'function' || !(exported.prototype instanceof Subscriber)) {
                    throw new SeedcordError(SeedcordErrorCode.SubscriberRouteNotASubscriber, [
                        keys,
                        row.exportName,
                        row.from
                    ]);
                }
                // justified: the two checks above prove it is a Subscriber subclass
                return exported as StoredSubscriberCtor;
            }
        } satisfies SubscriberRegistration);
    }
}
