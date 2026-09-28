import React, { forwardRef } from 'react';
import classNames from 'classnames';
import { t } from 'i18next';
import styles from './Section.less';

type Props = {
    className?: string,
    label?: string,
    children: React.ReactNode,
};

const Section = forwardRef<HTMLDivElement, Props>(({ className, label, children }, ref) => (
    <div ref={ref} className={classNames(className, styles['settings-section'])}>
        {label && <div className={styles['section-heading']}>{t(label)}</div>}
        {children}
    </div>
));

export default Section;
