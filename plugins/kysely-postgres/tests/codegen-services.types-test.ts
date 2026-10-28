import { expectTypeOf } from 'vitest';

import { RegisterKyselyService } from '#src/decorators/RegisterKyselyService';
import { KyselyService } from '#src/KyselyService';

import type { KyselyServices } from '#src/types/KyselyServices';

class Orders extends KyselyService<'products'> {}

// the row seedcord codegen writes for this plugin
declare module '@seedcord/core/plugin' {
    interface PluginTypes {
        '@seedcord/plugin-kysely-postgres': { services: { orders: typeof Orders } };
    }
}

@RegisterKyselyService('orders', { table: 'products' })
class RegistersGenerated extends KyselyService<'products'> {}

// @ts-expect-error codegen found no invoices service
@RegisterKyselyService('invoices')
class Unknown extends KyselyService<'products'> {}

void RegistersGenerated;
void Unknown;

expectTypeOf<KyselyServices['orders']>().toEqualTypeOf<Orders>();
