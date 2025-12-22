import { type ReactElement, Fragment } from 'react';

import EntityMembersSection from '../../EntityMembersSection';

import type { ClassLikeModel } from '../../types';

export function renderClassLike(model: ClassLikeModel): ReactElement {
    const showAccessControls = model.kind === 'class';
    const hasMembers =
        model.properties.length > 0 ||
        model.methods.length > 0 ||
        model.constructors.length > 0 ||
        model.typeParameters.length > 0;

    return (
        <Fragment>
            {hasMembers ? (
                <EntityMembersSection
                    properties={model.properties}
                    methods={model.methods}
                    constructors={model.constructors}
                    typeParameters={model.typeParameters}
                    showAccessControls={showAccessControls}
                    parentDeprecationStatus={model.deprecationStatus}
                />
            ) : null}
        </Fragment>
    );
}
