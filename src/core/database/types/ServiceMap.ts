import { Users } from '../services/Users';

export const ValidServiceKeys = ['users'] as const;
export type ValidServiceKey = (typeof ValidServiceKeys)[number];

interface AllServices {
  users: Users;
}

export type ServiceMap = {
  [K in ValidServiceKey]: AllServices[K];
};
