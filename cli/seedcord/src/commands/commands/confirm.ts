export type Confirm = (message: string) => Promise<boolean>;

// in flag mode and without a terminal, the command line is the go-ahead
export const PROCEED: Confirm = () => Promise.resolve(true);
