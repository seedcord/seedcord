import { IDocument } from '@seedcord/types';
import mongoose from 'mongoose';
import { BaseService, DatabaseModel, DatabaseService } from 'seedcord';

interface IUser extends IDocument {
  username: string;
}

@DatabaseService('users')
export class Users<Doc extends IUser = IUser> extends BaseService<Doc> {
  @DatabaseModel('users')
  public static schema = new mongoose.Schema<IUser>({
    username: { type: String, required: true, unique: true }
  });

  public test(): void {}
}

/* Declare Users to augment the ServiceMap */
declare module 'seedcord' {
  interface Services {
    users: Users;
  }
}
