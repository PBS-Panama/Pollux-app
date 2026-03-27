import React, { forwardRef } from 'react';
import { MultiselectMenu } from 'stremio/components';
import { Section, Option } from '../components';
import useInterfaceOptions from './useInterfaceOptions';

type Props = {
    profile: Profile,
};

const Interface = forwardRef<HTMLDivElement, Props>(({ profile }: Props, ref) => {
    const {
        interfaceLanguageSelect,
    } = useInterfaceOptions(profile);

    return (
        <Section ref={ref} label={'PREFERENCES'}>
            <Option label={'SETTINGS_UI_LANGUAGE'}>
                <MultiselectMenu
                    className={'multiselect'}
                    {...interfaceLanguageSelect}
                />
            </Option>
        </Section>
    );
});

export default Interface;
