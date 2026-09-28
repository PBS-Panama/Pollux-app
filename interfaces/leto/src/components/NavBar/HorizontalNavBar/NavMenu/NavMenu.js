// PBS Crewing Module — menú de perfil desplegable (R11, reescrito desde cero;
// R14: segunda pasada — useReducer en vez de useBinaryState, y el
// event-flag propio extraído a un hook aparte)
// Envuelve NavMenuContent en un Popup (bottom-left). Se cierra solo si la
// ruta deja de estar "arriba" del stack (otra pantalla se abrió encima).

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useRouteFocused } = require('pollux/common/router');
const Popup = require('pollux/components/Popup');
const NavMenuContent = require('./NavMenuContent');
const styles = require('./styles.less');

const CLOSE = 'close';
const TOGGLE = 'toggle';

const menuOpenReducer = (open, action) => {
    switch (action) {
        case CLOSE: return false;
        case TOGGLE: return !open;
        default: return open;
    }
};

// El click en el label del Popup y el click DENTRO del menú comparten el
// mismo tipo de evento (click) para que el flag de "no lo vuelvas a abrir"
// llegue a tiempo — ver components/Popup/Popup.js. Se aísla acá en su
// propio hook para no mezclarlo con el estado de abierto/cerrado.
const usePreventReopenOnMenuClick = () => {
    const onLabelClick = React.useCallback((event, onToggle) => {
        if (!event.nativeEvent.togglePopupPrevented) {
            onToggle();
        }
    }, []);
    const onMenuClick = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
    }, []);
    return { onLabelClick, onMenuClick };
};

const NavMenu = ({ renderLabel }) => {
    const routeFocused = useRouteFocused();
    const [menuOpen, dispatch] = React.useReducer(menuOpenReducer, false);
    const { onLabelClick, onMenuClick } = usePreventReopenOnMenuClick();

    const toggleMenu = React.useCallback(() => dispatch(TOGGLE), []);
    const closeMenu = React.useCallback(() => dispatch(CLOSE), []);

    const wrappedRenderLabel = React.useCallback(({ ref, className, children }) => (
        renderLabel({
            ref,
            className: classnames(className, { 'active': menuOpen }),
            onClick: (event) => onLabelClick(event, toggleMenu),
            children,
        })
    ), [menuOpen, onLabelClick, toggleMenu, renderLabel]);

    const renderMenu = React.useCallback(() => (
        <NavMenuContent onClick={onMenuClick} />
    ), [onMenuClick]);

    React.useEffect(() => {
        if (!routeFocused) dispatch(CLOSE);
    }, [routeFocused]);

    return (
        <Popup
            open={menuOpen}
            direction={'bottom-left'}
            onCloseRequest={closeMenu}
            renderLabel={wrappedRenderLabel}
            renderMenu={renderMenu}
            className={styles['nav-menu-popup-label']}
        />
    );
};

NavMenu.propTypes = {
    renderLabel: PropTypes.func
};

module.exports = NavMenu;
