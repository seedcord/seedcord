import { MongoDocument, MongoService, RegisterMongoModel, RegisterMongoService } from '@seedcord/plugins';
import mongoose from 'mongoose';

interface IUser extends MongoDocument {
    username: string;
}

@RegisterMongoService('users')
export class Users<Doc extends IUser = IUser> extends MongoService<Doc> {
    @RegisterMongoModel('users')
    public static schema = new mongoose.Schema<IUser>({
        username: { type: String, required: true, unique: true }
    });

    public test(): void {}
}

/* Declare Users to augment the ServiceMap */
declare module '@seedcord/plugins' {
    interface MongoServices {
        users: Users;
    }
}
