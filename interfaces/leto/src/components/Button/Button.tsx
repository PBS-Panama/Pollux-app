// PBS Crewing Module — botón genérico (R11, reescrito desde cero; R14:
// segunda pasada con otra descomposición interna)
// Renderiza <a> si viene `href`, si no <div role de botón> — foco por
// teclado (tabIndex=0), Enter dispara click, y el mousedown saca el foco
// visual después del click (mismo comportamiento que tenía antes).
// Simplificado: saqué el soporte de long-press (`use-long-press`) y los
// flags `buttonClickPrevented`/`buttonBlurPrevented` — confirmé por grep que
// ningún consumidor real de hoy los usa ni los setea.

import React, { createElement, forwardRef } from 'react';
import classNames from 'classnames';
import styles from './Button.less';

type Props = {
    className?: string,
    style?: object,
    href?: string,
    target?: string,
    title?: string,
    disabled?: boolean,
    tabIndex?: number,
    children: React.ReactNode,
    onKeyDown?: (event: React.KeyboardEvent) => void,
    onMouseDown?: (event: React.MouseEvent) => void,
    onMouseUp?: (event: React.MouseEvent) => void,
    onMouseLeave?: (event: React.MouseEvent) => void,
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void,
    onDoubleClick?: () => void,
};

// Un <div role=botón> no dispara `click` con Enter por sí solo — se lo
// forzamos acá, sin depender de que cada consumidor lo maneje.
const triggerClickOnEnter = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.click();
    }
};

// Evita que el mousedown le dé foco visual al botón (comportamiento default
// del navegador) y saca cualquier foco que hubiera quedado de una
// interacción anterior por teclado.
const blurActiveElement = (event: React.MouseEvent) => {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
};

// Combina el manejador propio del Button con el que haya pasado quien lo usa
// — ambos corren, en vez de que Button tenga que acordarse de chequear
// `typeof props.onX === 'function'` para cada evento por separado.
const withOwnHandler = <E,>(ownHandler: (event: E) => void, external?: (event: E) => void) => (
    (event: E) => {
        external?.(event);
        ownHandler(event);
    }
);

const Button = forwardRef(({ className, href, disabled, children, onKeyDown, onMouseDown, ...rest }: Props, ref) => {
    const isLink = typeof href === 'string' && href.length > 0;

    return createElement(
        isLink ? 'a' : 'div',
        {
            tabIndex: 0,
            ...rest,
            ref,
            className: classNames(className, styles['button-container'], { 'disabled': disabled }),
            href,
            onKeyDown: withOwnHandler(triggerClickOnEnter, onKeyDown),
            onMouseDown: withOwnHandler(blurActiveElement, onMouseDown),
        },
        children
    );
});

Button.displayName = 'Button';

export default Button;
