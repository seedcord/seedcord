import { ApiModel } from '@microsoft/api-extractor-model';

import type { ApiPackage } from '@microsoft/api-extractor-model';

/** One shared model so cross-package `resolveDeclarationReference` works across all loaded packages. */
export function createApiModel(): ApiModel {
    return new ApiModel();
}

export function loadApiPackage(model: ApiModel, apiJsonPath: string): ApiPackage {
    return model.loadPackage(apiJsonPath);
}
