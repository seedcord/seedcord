import type { DocNode, DocSignature } from '../types';

const identityForNode = (node: DocNode): string | null => {
    const qualified = node.qualifiedName.trim();
    if (qualified.length > 0) {
        return `${node.kind}:${qualified}`;
    }

    const path = node.path.join('.').trim();
    if (path.length > 0) {
        return `${node.kind}:${path}`;
    }

    const name = node.name.trim();
    if (name.length > 0) {
        return `${node.kind}:${name}`;
    }

    return null;
};

const identityForSignature = (signature: DocSignature): string | null => {
    const name = signature.name.trim();
    if (name.length === 0) {
        return null;
    }

    const typeParams = signature.typeParameters.map((param) => param.name.trim()).join(',');
    const parameters = signature.parameters.map((param) => param.name.trim()).join(',');

    return `${signature.kind}:${name}#${signature.overloadIndex}#${typeParams}#${parameters}`;
};

const findSignatureSourceUrl = (signature: DocSignature): string | undefined => {
    if (signature.sourceUrl && signature.sourceUrl.length > 0) {
        return signature.sourceUrl;
    }

    for (const source of signature.sources) {
        if (source.url && source.url.length > 0) {
            return source.url;
        }
    }

    return undefined;
};

const findNodeSourceUrl = (node: DocNode): string | undefined => {
    if (node.sourceUrl && node.sourceUrl.length > 0) {
        return node.sourceUrl;
    }

    for (const source of node.sources) {
        if (source.url && source.url.length > 0) {
            return source.url;
        }
    }

    for (const signature of node.signatures) {
        const signatureUrl = findSignatureSourceUrl(signature);
        if (signatureUrl) {
            return signatureUrl;
        }
    }

    return undefined;
};

const visit = (node: DocNode, buckets: Map<string, DocNode[]>): void => {
    const identity = identityForNode(node);
    if (identity) {
        const bucket = buckets.get(identity);
        if (bucket) {
            bucket.push(node);
        } else {
            buckets.set(identity, [node]);
        }
    }

    for (const child of node.children) {
        visit(child, buckets);
    }
};

const propagateSignatureSources = (nodes: DocNode[], nodeFallback: string | undefined): void => {
    const signatureBuckets = new Map<string, DocSignature[]>();

    for (const node of nodes) {
        for (const signature of node.signatures) {
            const identity = identityForSignature(signature);
            if (!identity) {
                continue;
            }

            const bucket = signatureBuckets.get(identity);
            if (bucket) {
                bucket.push(signature);
            } else {
                signatureBuckets.set(identity, [signature]);
            }
        }
    }

    for (const bucket of signatureBuckets.values()) {
        const fallback = bucket
            .map((signature) => findSignatureSourceUrl(signature))
            .find((value): value is string => typeof value === 'string' && value.length > 0);

        if (!fallback && !nodeFallback) {
            continue;
        }

        const sourceUrl = fallback ?? nodeFallback;
        if (!sourceUrl) {
            continue;
        }

        for (const signature of bucket) {
            if (!signature.sourceUrl || signature.sourceUrl.length === 0) {
                signature.sourceUrl = sourceUrl;
            }
        }
    }
};

export const propagateSourceInformation = (roots: DocNode[]): void => {
    const buckets = new Map<string, DocNode[]>();

    for (const root of roots) {
        visit(root, buckets);
    }

    for (const nodes of buckets.values()) {
        const fallback = nodes
            .map((node) => findNodeSourceUrl(node))
            .find((value): value is string => typeof value === 'string' && value.length > 0);

        if (fallback) {
            for (const node of nodes) {
                if (!node.sourceUrl || node.sourceUrl.length === 0) {
                    node.sourceUrl = fallback;
                }
            }
        }

        propagateSignatureSources(nodes, fallback);
    }
};
