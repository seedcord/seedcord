// chalk styles the messages
export const stripAnsi = (input: string): string => input.replaceAll(/\[[0-9;]*m/g, '');
