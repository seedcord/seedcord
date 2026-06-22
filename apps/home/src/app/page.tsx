import { BeforeAfter } from '@components/home/BeforeAfter';
import { Codec } from '@components/home/Codec';
import { FeatureGrid } from '@components/home/FeatureGrid';
import { Footer } from '@components/home/Footer';
import { Gates } from '@components/home/Gates';
import { GetStarted } from '@components/home/GetStarted';
import { Hero } from '@components/home/Hero';
import { FeatureMarquee } from '@components/home/Marquee';
import { Nav } from '@components/home/Nav';
import { ResolvedType } from '@components/home/ResolvedType';
import { TypedDx } from '@components/home/TypedDx';
import { FEATURES } from '@lib/features';

import type { ReactNode } from 'react';

function Home(): ReactNode {
    return (
        <>
            <Nav />
            <main>
                <Hero />
                <FeatureMarquee items={FEATURES} />
                <TypedDx />
                <ResolvedType />
                <BeforeAfter />
                <Codec />
                <Gates />
                <FeatureGrid />
                <GetStarted />
            </main>
            <Footer />
        </>
    );
}

export default Home;
