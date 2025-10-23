import { Slugger } from '../slugger';
import { CommentTransformer } from './comment-transformer';

import type { DocManifestPackage, DocNode } from '../types';

export interface TransformContextOptions {
    slugger?: Slugger;
    commentTransformer?: CommentTransformer;
    packagesByName?: Map<string, DocManifestPackage>;
    packagesByAlias?: Map<string, DocManifestPackage>;
}

export interface TransformContext {
    manifest: DocManifestPackage;
    slugger: Slugger;
    commentTransformer: CommentTransformer;
    nodes: Map<number, DocNode>;
    packagesByName: Map<string, DocManifestPackage>;
    packagesByAlias: Map<string, DocManifestPackage>;
}

export const createTransformContext = (
    manifest: DocManifestPackage,
    options: TransformContextOptions = {}
): TransformContext => {
    return {
        manifest,
        slugger: options.slugger ?? new Slugger(),
        commentTransformer: options.commentTransformer ?? new CommentTransformer(),
        nodes: new Map(),
        packagesByName: options.packagesByName ?? new Map<string, DocManifestPackage>(),
        packagesByAlias: options.packagesByAlias ?? new Map<string, DocManifestPackage>()
    };
};

export const registerNode = (context: TransformContext, node: DocNode): void => {
    context.nodes.set(node.id, node);
};
