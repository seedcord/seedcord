import { SeedcordErrorCode } from '@seedcord/errors';
import mongoose from 'mongoose';
import { describe, it, expect, expectTypeOf } from 'vitest';

import { RegisterMongooseService } from '#src/decorators/RegisterMongooseService';
import { MongooseService } from '#src/MongooseService';

interface IUser {
    _id: string;
    username: string;
}

declare module '#src/types/MongooseServices' {
    interface MongooseServices {
        users: WithSchema;
        products: WithProducts;
    }
}

@RegisterMongooseService('users')
class WithSchema extends MongooseService<IUser> {
    public static schema = new mongoose.Schema<IUser>({ username: { type: String, required: true } });
    public findUser(): void {}
}

@RegisterMongooseService('products')
class WithProducts extends MongooseService<IUser> {
    public static schema = new mongoose.Schema<IUser>({ username: { type: String, required: true } });
    public findProduct(): void {}
}

// @ts-expect-error decorated under 'products' while its shape matches the users service
@RegisterMongooseService('products')
class WrongKey extends MongooseService<IUser> {
    public static schema = new mongoose.Schema<IUser>({ username: { type: String, required: true } });
    public findUser(): void {}
}

void WithProducts;
void WrongKey;

@RegisterMongooseService('users', { modelName: 'app_users' })
class WithOverride extends MongooseService<IUser> {
    public static schema = new mongoose.Schema<IUser>({ username: { type: String, required: true } });
    public findUser(): void {}
}

// @ts-expect-error a service class declaring no static schema is rejected
@RegisterMongooseService('users')
class WithoutSchema extends MongooseService<IUser> {}

void WithOverride;
void WithoutSchema;

expectTypeOf<WithSchema['model']>().toEqualTypeOf<mongoose.Model<IUser>>();

expectTypeOf<
    Awaited<ReturnType<WithSchema['model']['findOne']>>
>().toEqualTypeOf<mongoose.HydratedDocument<IUser> | null>();

describe('empty override', () => {
    it('rejects an empty modelName at decoration time', () => {
        expect(() => {
            @RegisterMongooseService('users', { modelName: '' })
            class Empty extends MongooseService<IUser> {
                public static schema = new mongoose.Schema<IUser>({ username: { type: String, required: true } });
                public findUser(): void {}
            }
            void Empty;
        }).toThrow(expect.objectContaining({ code: SeedcordErrorCode.PluginMongooseModelNameMissing }));
    });
});
