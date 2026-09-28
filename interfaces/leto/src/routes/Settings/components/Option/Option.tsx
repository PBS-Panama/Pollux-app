import React from 'react';
import classNames from 'classnames';
import { t } from 'i18next';
import styles from './Option.less';

type Props = {
    className?: string,
    label: string,
    children: React.ReactNode,
};

// `icon` no tiene ningún consumidor real (grep en las 4 pantallas de
// Settings que usan `<Option>`) — se sacó, junto con el CSS de `.icon` en
// Option.less.
const Option = ({ className, label, children }: Props) => (
    <div className={classNames(className, styles['option'])}>
        <div className={styles['heading']}>
            <div className={styles['label']}>{t(label)}</div>
        </div>
        <div className={styles['content']}>
            {children}
        </div>
    </div>
);

export default Option;
