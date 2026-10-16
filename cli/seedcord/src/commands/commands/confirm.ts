export type Confirm = (message: string) => Promise<boolean>;

export const PROCEED: Confirm = () => Promise.resolve(true);
