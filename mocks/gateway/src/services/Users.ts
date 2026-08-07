import { MongooseService, RegisterMongooseService } from '@seedcord/plugin-mongoose';
import mongoose from 'mongoose';

import type { MongooseDocument } from '@seedcord/plugin-mongoose';

interface IUser extends MongooseDocument {
    username: string;
}

@RegisterMongooseService('users')
export class Users extends MongooseService<IUser> {
    public static schema = new mongoose.Schema<IUser>({
        username: { type: String, required: true, unique: true }
    });

    public test(): void {}
}

declare module '@seedcord/plugin-mongoose' {
    interface MongooseServices {
        users: Users;
    }
}
