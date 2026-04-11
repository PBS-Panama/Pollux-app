import React, { forwardRef, useState, useCallback } from 'react';
import { MultiselectMenu } from 'leto/components';
import { Section, Option } from '../components';

type Props = {
    profile: Profile,
};

const Interface = forwardRef<HTMLDivElement, Props>(({ profile }: Props, ref) => {
    const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
        try { return localStorage.getItem('leto-keyboard-shortcuts') !== 'off'; }
        catch { return true; }
    });

    const shortcutsSelect = {
        title: () => shortcutsEnabled ? 'Enabled' : 'Disabled',
        options: [
            { label: 'Enabled', value: 'on' },
            { label: 'Disabled', value: 'off' },
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
            <Option label={'Keyboard shortcuts (1-6 switches tabs)'}>
                <MultiselectMenu
                    className={'multiselect'}
                    {...shortcutsSelect}
                />
            </Option>
        </Section>
    );
});

export default Interface;
