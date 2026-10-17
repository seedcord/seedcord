import { messageOf } from '#cli/messageOf';

export function validatorFor(check: (value: string) => unknown): (value: string) => string | undefined {
    return (value) => {
        try {
            check(value);
            return undefined;
        } catch (error) {
            return messageOf(error);
        }
    };
}
