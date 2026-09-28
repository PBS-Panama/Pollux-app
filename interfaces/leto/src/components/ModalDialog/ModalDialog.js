// PBS Crewing Module — diálogo modal genérico (R11, reescrito desde cero)
// Título + botón de cerrar + contenido. Único consumidor real hoy:
// CompanyDashboard's modal de perfil rápido, que solo usa
// className/title/onCloseRequest/children — así que saqué `background`
// (tenía un bug real desde R4: sin esa prop pintaba `url('undefined')`,
// un 404 silencioso — más fácil borrar la funcionalidad que nadie usa que
// arrastrar el bug), `buttons` y `dataset`, ninguno con uso real hoy.

const React = require('react');
const { useTranslation } = require('react-i18next');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useRouteFocused, useModalsContainer, Modal } = require('pollux/common/router');
const { default: Button } = require('pollux/components/Button');
const { default: Icon } = require('pollux/common/Icon');
const styles = require('./styles');

const ModalDialog = ({ className, title, children, onCloseRequest, ...props }) => {
    const { t } = useTranslation();
    const routeFocused = useRouteFocused();
    const modalsContainer = useModalsContainer();
    const modalRef = React.useRef(null);

    const requestClose = React.useCallback((event) => {
        if (typeof onCloseRequest === 'function') {
            onCloseRequest({ type: 'close', reactEvent: event, nativeEvent: event?.nativeEvent });
        }
    }, [onCloseRequest]);

    const onBackdropMouseDown = React.useCallback((event) => {
        if (!event.nativeEvent.closeModalDialogPrevented) {
            requestClose(event);
        }
    }, [requestClose]);

    const onDialogMouseDown = React.useCallback((event) => {
        event.nativeEvent.closeModalDialogPrevented = true;
    }, []);

    React.useEffect(() => {
        if (!routeFocused) return undefined;
        const onKeyDown = (event) => {
            // -2 porque FocusLock mete divs de bloqueo de foco alrededor del contenido
            const isTopmostModal = modalsContainer.childNodes[modalsContainer.childElementCount - 2] === modalRef.current;
            if (event.code === 'Escape' && isTopmostModal) {
                requestClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [routeFocused, modalsContainer, requestClose]);

    return (
        <Modal ref={modalRef} {...props} className={classnames(className, styles['modal-container'])} onMouseDown={onBackdropMouseDown}>
            <div className={styles['dialog-frame']} onMouseDown={onDialogMouseDown}>
                <Button className={styles['close-button-container']} title={t('BUTTON_CLOSE')} onClick={requestClose}>
                    <Icon className={styles['icon']} name={'close'} />
                </Button>
                <div className={styles['dialog-content']}>
                    {typeof title === 'string' && title.length > 0 && (
                        <div className={styles['title-container']} title={title}>{title}</div>
                    )}
                    <div className={styles['body-container']}>
                        {children}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

ModalDialog.propTypes = {
    className: PropTypes.string,
    title: PropTypes.string,
    children: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.node),
        PropTypes.node
    ]),
    onCloseRequest: PropTypes.func
};

module.exports = ModalDialog;
