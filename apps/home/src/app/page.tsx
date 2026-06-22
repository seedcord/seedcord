import { Hero } from '@components/home/Hero';
import { FeatureMarquee } from '@components/home/Marquee';
import { Nav } from '@components/home/Nav';
import { FEATURES } from '@lib/features';

import type { ReactNode } from 'react';

function Home(): ReactNode {
    return (
        <>
            <Nav />
            <main>
                <Hero />
                <FeatureMarquee items={FEATURES} />
            </main>
        </>
    );
}

export default Home;
