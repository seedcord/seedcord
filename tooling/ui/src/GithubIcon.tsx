import { cn } from './lib/cn';

import type { ReactElement, SVGAttributes } from 'react';

export interface GithubIconProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
    size?: number;
    title?: string;
    variant?: keyof typeof VARIANTS;
}

const VARIANTS = {
    outline: {
        viewBox: '0 0 192 192',
        paint: {
            fill: 'none',
            stroke: 'currentColor',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 13.5
        },
        path: 'M120.755 170c.03-4.669.059-20.874.059-27.29 0-9.272-3.167-15.339-6.719-18.41 22.051-2.464 45.201-10.863 45.201-49.067 0-10.855-3.824-19.735-10.175-26.683 1.017-2.516 4.413-12.63-.987-26.32 0 0-8.296-2.672-27.202 10.204-7.912-2.213-16.371-3.308-24.784-3.352-8.414.044-16.872 1.14-24.785 3.352C52.457 19.558 44.162 22.23 44.162 22.23c-5.4 13.69-2.004 23.804-.987 26.32C36.824 55.498 33 64.378 33 75.233c0 38.204 23.149 46.603 45.2 49.067-3.551 3.071-6.719 9.138-6.719 18.41 0 6.416.03 22.621.059 27.29M27 130c9.939.703 15.67 9.735 15.67 9.735 8.834 15.199 23.178 10.803 28.815 8.265'
    },
    // mark-github-24 from @primer/octicons, MIT, with the viewBox cropped to its 23-unit circle
    mark: {
        viewBox: '0.5 1.045 23 23',
        paint: { fill: 'currentColor' },
        path: 'M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943'
    }
} as const satisfies Record<string, { viewBox: string; paint: SVGAttributes<SVGSVGElement>; path: string }>;

export function GithubIcon({
    size = 18,
    className,
    title,
    variant = 'outline',
    ...props
}: GithubIconProps): ReactElement {
    const { viewBox, paint, path } = VARIANTS[variant];
    return (
        <svg
            width={size}
            height={size}
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            {...paint}
            className={cn(className)}
            role={title ? 'img' : undefined}
            aria-label={title}
            {...props}
        >
            <path d={path} />
        </svg>
    );
}
