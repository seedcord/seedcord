import { MaterwelonGlyph } from './MaterwelonGlyph';
import { GLYPH_SIZE, OG_SIZE } from './og';
import { BRAND } from './palette';

import type { CSSProperties, ReactElement, ReactNode } from 'react';

const INSET = 48;
const RADIUS = 4;
const DROP = 10;

const BORDER = `3px solid ${BRAND.seedDark}`;

const panelBase: CSSProperties = {
    position: 'absolute',
    left: INSET,
    top: INSET,
    width: OG_SIZE.width - INSET * 2,
    height: OG_SIZE.height - INSET * 2,
    borderRadius: RADIUS
};

// Satori has no drop-shadow filter
export function OgMark({ width, offset }: { width: number; offset: number }): ReactElement {
    const ink = BRAND.seedDark;
    const height = (width * GLYPH_SIZE.height) / GLYPH_SIZE.width;

    return (
        <div style={{ position: 'relative', display: 'flex', flexShrink: 0, width, height }}>
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'flex',
                    transform: `translate(${offset}px, ${offset}px)`
                }}
            >
                <MaterwelonGlyph
                    width={width}
                    fills={{ flesh: ink, seeds: ink, rind: ink, pith: ink }}
                    style={{ opacity: 0.85 }}
                />
            </div>
            <MaterwelonGlyph
                width={width}
                fills={{ flesh: BRAND.flesh, seeds: BRAND.seedDark, rind: BRAND.rind, pith: BRAND.pith }}
            />
        </div>
    );
}

export function OgFooter({
    height,
    paddingX,
    children
}: {
    height: number;
    paddingX: number;
    children: ReactNode;
}): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height,
                padding: `0 ${paddingX}px`,
                borderTop: BORDER
            }}
        >
            {children}
        </div>
    );
}

// every seedcord og card draws this frame, the body and footer come from the app
export function OgFrame({ children }: { children: ReactNode }): ReactElement {
    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                width: OG_SIZE.width,
                height: OG_SIZE.height,
                backgroundColor: BRAND.pith
            }}
        >
            <div
                style={{
                    ...panelBase,
                    backgroundColor: BRAND.seedDark,
                    transform: `translate(${DROP}px, ${DROP}px)`
                }}
            />
            <div
                style={{
                    ...panelBase,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: BRAND.pith,
                    border: BORDER
                }}
            >
                {children}
            </div>
        </div>
    );
}
