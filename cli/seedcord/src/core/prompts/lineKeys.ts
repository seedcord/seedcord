import type { LineEditor } from './LineEditor';
import type { KeyPress } from './usePrompt';
import type { Key } from 'ink';

type KeyRule = readonly [matches: (press: KeyPress) => boolean, edit: (line: LineEditor) => LineEditor];

const ctrl =
    (letter: string) =>
    ({ input, key }: KeyPress): boolean =>
        key.ctrl && input === letter;

// option+letter reaches ink as meta only when the terminal sends option as escape: iTerm's Esc+,
// Terminal.app's "Use Option as Meta key" or Ghostty's macos-option-as-alt
const alt =
    (letter: string) =>
    ({ input, key }: KeyPress): boolean =>
        key.meta && input === letter;

const byWord = (key: Key): boolean => key.ctrl || key.meta;

const KEY_RULES: readonly KeyRule[] = [
    [({ key }) => key.backspace && byWord(key), (line) => line.deleteWordBack()],
    [ctrl('w'), (line) => line.deleteWordBack()],
    [({ key }) => key.backspace && !byWord(key), (line) => line.deleteBack()],
    [({ key }) => key.delete && byWord(key), (line) => line.deleteWordForward()],
    [alt('d'), (line) => line.deleteWordForward()],
    [({ key }) => key.delete && !byWord(key), (line) => line.deleteForward()],
    // Ghostty and iTerm send cmd+backspace as ctrl+u. unverified on other terminals
    [ctrl('u'), (line) => line.deleteToStart()],
    [ctrl('k'), (line) => line.deleteToEnd()],
    [({ key }) => key.leftArrow && byWord(key), (line) => line.wordLeft()],
    [alt('b'), (line) => line.wordLeft()],
    [({ key }) => key.rightArrow && byWord(key), (line) => line.wordRight()],
    [alt('f'), (line) => line.wordRight()],
    [({ key }) => key.leftArrow && !byWord(key), (line) => line.left()],
    [({ key }) => key.rightArrow && !byWord(key), (line) => line.right()],
    [({ key }) => key.home, (line) => line.start()],
    [ctrl('a'), (line) => line.start()],
    [({ key }) => key.end, (line) => line.end()],
    [ctrl('e'), (line) => line.end()]
];

function isText({ input, key }: KeyPress): boolean {
    return input !== '' && !key.ctrl && !key.meta && !key.tab && !key.return && !key.escape;
}

export function editLine(line: LineEditor, press: KeyPress): LineEditor {
    const rule = KEY_RULES.find(([matches]) => matches(press));
    if (rule) return rule[1](line);
    return isText(press) ? line.insert(press.input) : line;
}
