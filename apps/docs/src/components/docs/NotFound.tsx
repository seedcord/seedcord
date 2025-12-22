import type { ReactElement } from 'react';

function NotFound(): ReactElement {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
                <h1 className="text-6xl font-bold">404</h1>
                <p className="mt-2 text-xl">Not Found</p>
            </div>
        </div>
    );
}

export default NotFound;
