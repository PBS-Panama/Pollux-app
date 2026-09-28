import React from 'react';
import { Button } from 'pollux/components';
import styles from './Link.less';

// Los 3 usos reales (General.tsx, User.tsx x2) o navegan (href, con
// target opcional) o disparan una acción (onClick) — nunca las dos cosas a
// la vez. Modelarlo como unión discriminada en vez de "todo opcional" deja
// esa regla en el tipo, no solo en la cabeza de quien lo llama.
type Props = {
    label: string,
} & (
    | { href: string, target?: string, onClick?: never }
    | { href?: never, target?: never, onClick: () => void }
);

const Link = (props: Props) => (
    <Button
        className={styles['settings-link']}
        title={props.label}
        href={props.href}
        target={props.href ? (props.target ?? '_blank') : undefined}
        onClick={props.onClick}
    >
        <div className={styles['settings-link-label']}>{props.label}</div>
    </Button>
);

export default Link;
