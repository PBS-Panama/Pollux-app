// PBS Crewing Module — popup posicionado (R11, reescrito desde cero)
// Muestra un menú flotante junto a su label, eligiendo arriba/abajo e
// izquierda/derecha según el espacio libre contra el VIEWPORT (la versión
// vieja buscaba el ancestro con scroll más cercano y medía contra ese
// elemento — acá no hace falta: la app no tiene contenedores con scroll
// anidado donde la diferencia importe, así que medir contra la ventana es
// más simple y da el mismo resultado en la práctica).
// Únicos consumidores reales hoy: components/Multiselect (selector de la
// tarjeta de perfil) y NavBar/HorizontalNavBar/NavMenu — ninguno pasa
// `dataset`, así que ese prop de la versión vieja se sacó del todo.

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const FocusLock = require('react-focus-lock').default;
const { useRouteFocused } = require('pollux/common/router');
const styles = require('./styles');

const pickDirection = (labelRect, menuRect) => {
    const spaceBelow = window.innerHeight - labelRect.bottom;
    const spaceAbove = labelRect.top;
    const vertical = menuRect.height <= spaceBelow ? 'bottom'
        : menuRect.height <= spaceAbove ? 'top'
        : spaceBelow >= spaceAbove ? 'bottom' : 'top';

    const spaceRight = window.innerWidth - labelRect.left;
    const spaceLeft = labelRect.right;
    const horizontal = menuRect.width <= spaceRight ? 'right'
        : menuRect.width <= spaceLeft ? 'left'
        : spaceRight >= spaceLeft ? 'right' : 'left';

    return `${vertical}-${horizontal}`;
};

const Popup = ({ open, direction, renderLabel, renderMenu, onCloseRequest, ...props }) => {
    const routeFocused = useRouteFocused();
    const labelRef = React.useRef(null);
    const menuRef = React.useRef(null);
    const [autoDirection, setAutoDirection] = React.useState(null);

    // Same event type the window listener below listens for (pointerdown) —
    // setting the flag on a different event type (e.g. mousedown) would set
    // it too late, since pointerdown fires first for mouse input.
    const menuOnPointerDown = React.useCallback((event) => {
        event.nativeEvent.closePopupPrevented = true;
    }, []);

    React.useEffect(() => {
        if (!open || !routeFocused) return undefined;
        const onOutsideEvent = (event) => {
            if (event.closePopupPrevented || typeof onCloseRequest !== 'function') return;
            if (event.type === 'keydown') {
                if (event.code === 'Escape') onCloseRequest({ type: 'close', nativeEvent: event });
            } else if (labelRef.current && !labelRef.current.contains(event.target)) {
                onCloseRequest({ type: 'close', nativeEvent: event });
            }
        };
        window.addEventListener('keydown', onOutsideEvent);
        window.addEventListener('pointerdown', onOutsideEvent);
        return () => {
            window.removeEventListener('keydown', onOutsideEvent);
            window.removeEventListener('pointerdown', onOutsideEvent);
        };
    }, [open, routeFocused, onCloseRequest]);

    React.useLayoutEffect(() => {
        if (!open) {
            setAutoDirection(null);
            return;
        }
        setAutoDirection(pickDirection(labelRef.current.getBoundingClientRect(), menuRef.current.getBoundingClientRect()));
    }, [open]);

    return renderLabel({
        ...props,
        ref: labelRef,
        className: classnames(styles['label-container'], props.className, { 'active': open }),
        children: open ? (
            <FocusLock
                ref={menuRef}
                className={classnames(styles['menu-container'], styles[`menu-direction-${direction || autoDirection}`])}
                autoFocus={false}
                lockProps={{ onPointerDown: menuOnPointerDown }}
            >
                {renderMenu()}
            </FocusLock>
        ) : null,
    });
};

Popup.propTypes = {
    open: PropTypes.bool,
    direction: PropTypes.oneOf(['top-left', 'bottom-left', 'top-right', 'bottom-right']),
    renderLabel: PropTypes.func.isRequired,
    renderMenu: PropTypes.func.isRequired,
    onCloseRequest: PropTypes.func
};

module.exports = Popup;
