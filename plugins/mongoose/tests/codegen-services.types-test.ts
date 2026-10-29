import mongoose from 'mongoose';
import { expectTypeOf } from 'vitest';

import { RegisterMongooseService } from '#src/decorators/RegisterMongooseService';
import { MongooseService } from '#src/MongooseService';

import type { MongooseServices } from '#src/types/MongooseServices';

interface IOrder {
    _id: string;
    total: number;
}

class Orders extends MongooseService<IOrder> {
    public static schema = new mongoose.Schema<IOrder>({ total: Number });
}

// the row seedcord codegen writes for this plugin
declare module '@seedcord/core/plugin' {
    interface PluginTypes {
        '@seedcord/plugin-mongoose': { services: { orders: typeof Orders } };
    }
}

@RegisterMongooseService('orders')
class RegistersGenerated extends MongooseService<IOrder> {
    public static schema = new mongoose.Schema<IOrder>({ total: Number });
}

// @ts-expect-error codegen found no invoices service
@RegisterMongooseService('invoices')
class Unknown extends MongooseService<IOrder> {
    public static schema = new mongoose.Schema<IOrder>({ total: Number });
}

void RegistersGenerated;
void Unknown;

expectTypeOf<MongooseServices['orders']>().toEqualTypeOf<Orders>();
