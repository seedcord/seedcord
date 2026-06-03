'use client';

import { useState, useEffect } from 'react';

import type { SignatureSelection } from '@components/docs/entity/member/MemberRowBody';
import type { EntityMemberSummary } from '@lib/docs/types';

export function useActiveSignature(member: EntityMemberSummary): SignatureSelection {
    const [activeSignatureId, setActiveSignatureId] = useState(() => member.signatures[0]?.id ?? '');

    useEffect(() => {
        const first = member.signatures[0];
        if (!first) return;
        if (!activeSignatureId || !member.signatures.some((s) => s.id === activeSignatureId)) {
            let t: number | undefined;
            if (typeof window !== 'undefined') {
                // justified: defers initial signature selection until after the signature list mounts so the <MemberRowHeader> ref is attached before scrolling.
                t = window.setTimeout(() => setActiveSignatureId(first.id), 0);
            }

            return () => {
                if (typeof window !== 'undefined' && t !== undefined) window.clearTimeout(t);
            };
        }
        return undefined;
    }, [member.signatures, activeSignatureId]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const init = (): void => {
            const hash = window.location.hash.slice(1);
            if (!hash) return;
            const matching = member.signatures.find((s) => s.id === hash || s.anchor === hash);
            if (matching && matching.id !== activeSignatureId) {
                setActiveSignatureId(matching.id);
            }
        };

        // justified: window.location.hash is unavailable during SSR, the timer schedules a post-hydration read so the URL drives the initial active signature.
        const initTimeout = window.setTimeout(init, 0);
        const onHash = (): void => {
            const hash = window.location.hash.slice(1);
            if (!hash) return;
            const matching = member.signatures.find((s) => s.id === hash || s.anchor === hash);
            if (matching) setActiveSignatureId(matching.id);
        };

        window.addEventListener('hashchange', onHash);
        return () => {
            window.clearTimeout(initTimeout);
            window.removeEventListener('hashchange', onHash);
        };
    }, [member.signatures, activeSignatureId]);

    return [activeSignatureId, setActiveSignatureId];
}
