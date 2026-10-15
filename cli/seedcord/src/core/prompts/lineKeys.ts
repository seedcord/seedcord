import type { LineEditor } from './LineEditor';
import type { KeyPress } from './usePrompt';

type KeyRule = readonly [matches: (press: KeyPress) => boolean, edit: (line: LineEditor) => LineEditor];

const ctrl =
    (letter: string) =>
    ({ input, key }: KeyPress): boolean =>
        key.ctrl && input === letter;

// ink reads a mac option+letter as meta plus the letter
const alt =
    (letter: string) =>
    ({ input, key }: KeyPress): boolean =>
        key.meta && input === letter;

// a modified key's rule sits above its plain one
const KEY_RULES: readonly KeyRule[] = [
    [({ key }) => key.backspace && key.meta, (line) => line.deleteWordBack()],
    [ctrl('w'), (line) => line.deleteWordBack()],
    [({ key }) => key.backspace, (line) => line.deleteBack()],
    [({ key }) => key.delete && key.ctrl, (line) => line.deleteWordForward()],
    [alt('d'), (line) => line.deleteWordForward()],
    [({ key }) => key.delete, (line) => line.deleteForward()],
    // mac terminals send cmd+backspace as ctrl+u
    [ctrl('u'), (line) => line.deleteToStart()],
    [ctrl('k'), (line) => line.deleteToEnd()],
    [({ key }) => key.leftArrow && (key.ctrl || key.meta), (line) => line.wordLeft()],
    [alt('b'), (line) => line.wordLeft()],
    [({ key }) => key.rightArrow && (key.ctrl || key.meta), (line) => line.wordRight()],
    [alt('f'), (line) => line.wordRight()],
    [({ key }) => key.leftArrow, (line) => line.left()],
    [({ key }) => key.rightArrow, (line) => line.right()],
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
