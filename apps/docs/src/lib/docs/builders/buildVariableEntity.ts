import type { BaseEntityModel, VariableEntityModel } from '#lib/docs/types';

export function buildVariableEntity(base: BaseEntityModel & { kind: 'variable' }): VariableEntityModel {
    return { ...base, declaration: base.signature };
}
