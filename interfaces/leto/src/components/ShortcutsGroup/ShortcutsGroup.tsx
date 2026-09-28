import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import Combos from './Combos';
import styles from './ShortcutsGroup.less';

type Props = {
    className?: string,
    group: ShortcutGroup,
};

const ShortcutRow = ({ shortcut }: { shortcut: Shortcut }) => {
    const { t } = useTranslation();
    return (
        <div className={styles['shortcut-row']}>
            <div className={styles['shortcut-label']}>{t(shortcut.label)}</div>
            <Combos combos={shortcut.combos} />
        </div>
    );
};

// Recibe el grupo entero (en vez de desarmarlo en label/shortcuts sueltos)
// — los 2 consumidores reales (Settings > Shortcuts, ShortcutsModal) ya
// tienen el objeto completo a mano, no hace falta que lo desarmen ellos
// para volver a armarlo acá.
const ShortcutsGroup = ({ className, group }: Props) => {
    const { t } = useTranslation();

    return (
        <div className={classNames(className, styles['shortcuts-group'])}>
            <div className={styles['group-title']}>{t(group.label)}</div>
            <div className={styles['shortcut-list']}>
                {group.shortcuts.map((shortcut) => (
                    <ShortcutRow key={shortcut.name} shortcut={shortcut} />
                ))}
            </div>
        </div>
    );
};

export default ShortcutsGroup;
