import React, { forwardRef, useState, useCallback } from 'react';
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

    const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
        try { return localStorage.getItem('leto-keyboard-shortcuts') !== 'off'; }
        catch { return true; }
    });

    const toggleShortcuts = useCallback(() => {
        const next = !shortcutsEnabled;
        setShortcutsEnabled(next);
        localStorage.setItem('leto-keyboard-shortcuts', next ? 'on' : 'off');
    }, [shortcutsEnabled]);

    const shortcutsSelect = {
        title: () => shortcutsEnabled ? 'Activados' : 'Desactivados',
        options: [
            { label: 'Activados', value: 'on' },
            { label: 'Desactivados', value: 'off' },
        ],
        onSelect: (val: string) => {
            const on = val === 'on';
            setShortcutsEnabled(on);
            localStorage.setItem('leto-keyboard-shortcuts', on ? 'on' : 'off');
        },
        value: shortcutsEnabled ? 'on' : 'off',
    };

    return (
        <Section ref={ref} label={'PREFERENCES'}>
            <Option label={'SETTINGS_UI_LANGUAGE'}>
                <MultiselectMenu
                    className={'multiselect'}
                    {...interfaceLanguageSelect}
                />
            </Option>
            <Option label={'Atajos de teclado (1-6 cambia tabs)'}>
                <MultiselectMenu
                    className={'multiselect'}
                    {...shortcutsSelect}
                />
            </Option>
        </Section>
    );
});

export default Interface;
