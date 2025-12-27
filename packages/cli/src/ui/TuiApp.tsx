import { Box, Text } from 'ink';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { TuiSnapshot, TuiStore } from './TuiStore';
import type { ReactElement } from 'react';

interface TuiAppProps {
    readonly store: TuiStore;
}

export function TuiApp({ store }: TuiAppProps): ReactElement {
    const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
    const getSnapshot = useCallback(() => store.snapshot(), [store]);

    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const statusLines = useMemo(() => composeStatusLines(snapshot), [snapshot]);

    return (
        <Box flexDirection="column">
            {snapshot.sections.map((section) => (
                <SectionLines key={section.id} lines={section.lines} />
            ))}
            {statusLines.length > 0 ? <SectionLines lines={statusLines} /> : null}
        </Box>
    );
}

interface SectionLinesProps {
    readonly lines: readonly string[];
}

function SectionLines({ lines }: SectionLinesProps): ReactElement {
    return (
        <Box flexDirection="column">
            {lines.map((line, index) => (
                <Text key={index}>{normalizeLine(line)}</Text>
            ))}
        </Box>
    );
}

function composeStatusLines(snapshot: TuiSnapshot): readonly string[] {
    if (!snapshot.showStatusLine) return [];

    const status = snapshot.statusLine;
    const spinner = snapshot.spinner;

    if (!status && !spinner) return [];

    const lines: string[] = [''];

    if (spinner && status) {
        lines.push(`${spinner.frame} ${status}`);
    } else if (spinner) {
        lines.push(`${spinner.frame} ${spinner.text ?? ''}`.trimEnd());
    } else if (status) {
        lines.push(status);
    }

    return lines;
}

function normalizeLine(line: string): string {
    return line === '' ? ' ' : line;
}
