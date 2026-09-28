import React, { forwardRef } from 'react';
import { MultiselectMenu } from 'pollux/components';
import { Section, Option } from '../components';
import useInterfaceOptions from './useInterfaceOptions';
import ThemeSwitcher from './ThemeSwitcher';

const Interface = forwardRef<HTMLDivElement, {}>((_props, ref) => {
    const { interfaceLanguageSelect } = useInterfaceOptions();

    return (
        <Section ref={ref} label={'INTERFACE'}>
            <Option label={'Tema'}>
                <ThemeSwitcher />
            </Option>
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
