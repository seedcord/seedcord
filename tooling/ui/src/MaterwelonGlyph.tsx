import type { CSSProperties, ReactElement } from 'react';

export interface MaterwelonFills {
    flesh: string;
    seeds: string;
    rind: string;
    cream: string;
}

interface MaterwelonGlyphProps {
    fills: MaterwelonFills;
    width?: number;
    className?: string;
    style?: CSSProperties;
}

const VIEW_W = 596.16;
const VIEW_H = 500.4;

// fills are a prop because the site renders the CSS-var palette while the OG image (Satori) needs literal hex
export function MaterwelonGlyph({ fills, width, className, style }: MaterwelonGlyphProps): ReactElement {
    return (
        <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            width={width}
            height={width === undefined ? undefined : (width * VIEW_H) / VIEW_W}
            className={className}
            style={style}
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="220.32" cy="280.08" r="220.32" fill={fills.flesh} />
            <g fill={fills.seeds}>
                <ellipse
                    cx="95.4"
                    cy="161.28"
                    rx="11.81"
                    ry="6.98"
                    transform="translate(-81.54 222.97) rotate(-78.62)"
                />
                <path d="M148.02,254.61c-2.27-6.12-7.04-9.98-10.66-8.64-3.61,1.34-4.7,7.39-2.43,13.5,2.27,6.12,7.04,9.98,10.66,8.64s4.7-7.39,2.43-13.5Z" />
                <path d="M280.5,181.89c-2.27-6.12-7.04-9.98-10.66-8.64-3.61,1.34-4.7,7.39-2.43,13.5,2.27,6.12,7.04,9.98,10.66,8.64,3.61-1.34,4.7-7.39,2.43-13.5Z" />
                <path d="M421.46,311.53c-3.6-1.38-8.41,2.45-10.74,8.54-2.33,6.09-1.3,12.15,2.3,13.53,3.6,1.38,8.41-2.45,10.74-8.54,2.33-6.09,1.3-12.15-2.3-13.53Z" />
                <path d="M244.33,71.5c-6.52.11-11.76,3.32-11.7,7.17.06,3.85,5.4,6.89,11.92,6.79,6.52-.11,11.76-3.32,11.7-7.17-.06-3.85-5.4-6.89-11.92-6.79Z" />
                <path d="M133.24,411.7c-1.22-3.66-7.23-4.94-13.42-2.88-6.19,2.07-10.21,6.71-8.99,10.36,1.22,3.66,7.23,4.94,13.42,2.88,6.19-2.07,10.21-6.71,8.99-10.36Z" />
                <ellipse
                    cx="243.72"
                    cy="314.64"
                    rx="6.98"
                    ry="11.81"
                    transform="translate(-132.84 443.47) rotate(-71.13)"
                />
                <ellipse
                    cx="45.72"
                    cy="334.08"
                    rx="11.81"
                    ry="6.98"
                    transform="translate(-263.02 198.51) rotate(-58.5)"
                />
                <path d="M241.61,442.54c-3.61-5.43-9.14-8.11-12.35-5.97-3.21,2.13-2.89,8.27.73,13.7,3.61,5.43,9.14,8.11,12.35,5.97,3.21-2.13,2.89-8.27-.73-13.7Z" />
                <path d="M311.66,393.41c-6.46-.91-12.13,1.44-12.67,5.26s4.26,7.65,10.72,8.57c6.46.91,12.13-1.44,12.67-5.26.54-3.82-4.26-7.65-10.72-8.57Z" />
            </g>
            <circle cx="434.88" cy="161.28" r="161.28" fill={fills.rind} opacity="0.9" />
            <circle
                cx="409.32"
                cy="373.32"
                r="104.76"
                fill={fills.cream}
                transform="translate(-144.09 398.78) rotate(-45)"
            />
        </svg>
    );
}
