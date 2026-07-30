import {
    MongooseDocument,
    MongooseService,
    RegisterMongooseModel,
    RegisterMongooseService
} from '@seedcord/plugin-mongoose';
import mongoose from 'mongoose';

interface IUser extends MongooseDocument {
    username: string;
}

@RegisterMongooseService('users')
export class Users<Doc extends IUser = IUser> extends MongooseService<Doc> {
    @RegisterMongooseModel('users')
    public static schema = new mongoose.Schema<IUser>({
        username: { type: String, required: true, unique: true }
    });

    public test(): void {}
}

/* Declare Users to augment the ServiceMap */
declare module '@seedcord/plugin-mongoose' {
    interface MongooseServices {
        users: Users;
    }
}
