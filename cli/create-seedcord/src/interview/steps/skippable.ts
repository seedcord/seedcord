const SKIP_WARNING = 'Nothing pasted. Press Enter again to leave it empty in .env for now.';

export const SKIP_HINT = 'or press Enter to add it to .env later';

function isEmptyPaste(value: string | undefined): boolean {
    return (value ?? '').trim() === '';
}

export function answerOf<Value>(pasted: string, parse: (raw: string) => Value): Value | null {
    return isEmptyPaste(pasted) ? null : parse(pasted);
}

// clack calls validate on every Enter, so the first empty one warns and the second goes through
export function skippable(
    parse: (raw: string) => unknown,
    fallback: string
): (value: string | undefined) => string | undefined {
    let warned = false;

    return (value) => {
        if (isEmptyPaste(value)) {
            if (warned) return undefined;
            warned = true;
            return SKIP_WARNING;
        }

        warned = false;
        try {
            parse(value ?? '');
            return undefined;
        } catch (error) {
            return Error.isError(error) ? error.message : fallback;
        }
    };
}
