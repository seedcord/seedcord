import type { ReactNode } from 'react';

function SettingsRow({
    title,
    subtitle,
    children
}: {
    title: string;
    subtitle?: string;
    children?: ReactNode;
}): React.ReactElement {
    return (
        <div className="flex items-center justify-between gap-4 rounded-md px-2 py-2">
            <div className="min-w-0">
                <div className="text-sm font-medium text-(--text)">{title}</div>
                {subtitle ? <div className="text-subtle text-xs">{subtitle}</div> : null}
            </div>

            <div className="shrink-0">{children}</div>
        </div>
    );
}

export default SettingsRow;
