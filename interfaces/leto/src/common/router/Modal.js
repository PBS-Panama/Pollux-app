// PBS Crewing Module — router: portal de modal
// components/ModalDialog pinta su contenido acá adentro: un portal hacia el
// contenedor de modales del nivel de ruta activo (context.js), con el foco
// atrapado mientras está abierto (react-focus-lock). Sin lógica de pantalla
// propia — es el mecanismo de portal, nada más.

const React = require('react');
const ReactDOM = require('react-dom');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const FocusLock = require('react-focus-lock').default;
const { useModalsContainer } = require('./context');

// Separado de Modal para que el forwardRef del portal apunte directo al nodo
// bloqueado por FocusLock, sin mezclar esa pieza con la resolución del
// contenedor destino.
const FocusTrappedContent = React.forwardRef(({ className, autoFocus, disabled, lockProps, children }, ref) => (
    <FocusLock ref={ref} className={className} autoFocus={autoFocus} disabled={disabled} lockProps={lockProps}>
        {children}
    </FocusLock>
));
FocusTrappedContent.displayName = 'FocusTrappedContent';

const Modal = React.forwardRef(({ className, autoFocus, disabled, children, ...lockProps }, ref) => {
    const portalTarget = useModalsContainer();
    if (!(portalTarget instanceof HTMLElement)) {
        return null;
    }
    return ReactDOM.createPortal(
        <FocusTrappedContent
            ref={ref}
            className={classnames(className, 'modal-container')}
            autoFocus={!!autoFocus}
            disabled={!!disabled}
            lockProps={lockProps}
        >
            {children}
        </FocusTrappedContent>,
        portalTarget
    );
});

Modal.displayName = 'Modal';

Modal.propTypes = {
    className: PropTypes.string,
    autoFocus: PropTypes.bool,
    disabled: PropTypes.bool,
    children: PropTypes.node
};

module.exports = Modal;
