// PBS Crewing Module — modal de atajos de teclado (R11, reescrito desde cero)
// Portal simple a document.body con backdrop + Escape para cerrar. Los datos
// que muestra (common/Shortcuts/shortcuts.json) ya son propios desde R1/R2.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Icon from 'pollux/common/Icon';
import { useShortcuts } from 'pollux/common';
import { Button, ShortcutsGroup } from 'pollux/components';
import styles from './styles.less';

type Props = {
    onClose: () => void,
};

const ShortcutsModal = ({ onClose }: Props) => {
    const { t } = useTranslation();
    const { grouped } = useShortcuts();

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return createPortal(
        <div className={styles['modal-overlay']}>
            <div className={styles['modal-backdrop']} onClick={onClose} />
            <div className={styles['modal-box']}>
                <div className={styles['modal-header']}>
                    <div className={styles['modal-title']}>{t('SETTINGS_NAV_SHORTCUTS')}</div>
                    <Button className={styles['modal-close-button']} title={t('BUTTON_CLOSE')} onClick={onClose}>
                        <Icon className={styles['modal-close-icon']} name={'close'} />
                    </Button>
                </div>
                <div className={styles['modal-body']}>
                    {grouped.map((group) => (
                        <ShortcutsGroup key={group.name} group={group} />
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ShortcutsModal;
