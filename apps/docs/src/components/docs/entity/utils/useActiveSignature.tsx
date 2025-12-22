'use client';

import { useState, useEffect } from 'react';

import type { SignatureSelection } from '../member/MemberCardBody';
import type { EntityMemberSummary } from '../types';

export function useActiveSignature(member: EntityMemberSummary): SignatureSelection {
    const [activeSignatureId, setActiveSignatureId] = useState(() => member.signatures[0]?.id ?? '');

    useEffect(() => {
        const first = member.signatures[0];
        if (!first) return;
        if (!activeSignatureId || !member.signatures.some((s) => s.id === activeSignatureId)) {
            let t: number | undefined;
            if (typeof window !== 'undefined') {
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
