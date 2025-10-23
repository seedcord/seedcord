import { DatabaseModel, DatabaseService, IDocument, MongoService } from '@seedcord/plugins';
import mongoose from 'mongoose';

interface IUser extends IDocument {
    username: string;
}

@DatabaseService('users')
export class Users<Doc extends IUser = IUser> extends MongoService<Doc> {
    @DatabaseModel('users')
    public static schema = new mongoose.Schema<IUser>({
        username: { type: String, required: true, unique: true }
    });

    public test(): void {}
}

/* Declare Users to augment the ServiceMap */
declare module '@seedcord/plugins' {
    interface Services {
        users: Users;
    }
}
