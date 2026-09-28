import React, { forwardRef } from 'react';
import { Section } from '../components';
import { ShortcutsGroup } from 'pollux/components';
import { useShortcuts } from 'pollux/common';
import styles from './Shortcuts.less';

const Shortcuts = forwardRef<HTMLDivElement>((_props, ref) => {
    const { grouped } = useShortcuts();

    return (
        <Section ref={ref} label={'SETTINGS_NAV_SHORTCUTS'}>
            {grouped.map((group) => (
                <ShortcutsGroup key={group.name} className={styles['group']} group={group} />
            ))}
        </Section>
    );
});

export default Shortcuts;
