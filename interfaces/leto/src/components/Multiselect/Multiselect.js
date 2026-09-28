// PBS Crewing Module — options menu (R8)
// Rewritten from scratch: the old Multiselect supported a modal mode,
// multi-value "selected" chips, and a self-rendered label with no real use
// today — its one real consumer, components/MetaItem/MetaItem.js (untouched,
// pending Rick's decision on Library), always supplies its own
// renderLabelContent and never passes mode/selected/title/dataset. Same
// external contract (className, renderLabelContent, options, onOpen,
// onClose, onSelect, onClick, tabIndex) so MetaItem needs no changes.

const React = require('react');
const { useTranslation } = require('react-i18next');
const { Button } = require('pollux/components');
const Popup = require('pollux/components/Popup');
const useBinaryState = require('pollux/common/useBinaryState');
const styles = require('./styles');

const Multiselect = ({ className, options, renderLabelContent, onOpen, onClose, onSelect, onClick, ...props }) => {
    const { t } = useTranslation();
    const [menuOpen, , closeMenu, toggleMenu] = useBinaryState(false);

    const validOptions = React.useMemo(() => (
        Array.isArray(options) ? options.filter((option) => option && typeof option.value === 'string') : []
    ), [options]);

    const labelOnClick = React.useCallback((event) => {
        if (typeof onClick === 'function') {
            onClick(event);
        }
        if (!event.nativeEvent.toggleMenuPrevented) {
            toggleMenu();
        }
    }, [onClick, toggleMenu]);

    // Clicks inside the menu bubble up into the label Button above (the menu
    // renders as its `children`) — mark the event so labelOnClick doesn't
    // immediately re-toggle right after an option click closes it.
    const menuOnClick = React.useCallback((event) => {
        event.nativeEvent.toggleMenuPrevented = true;
    }, []);

    const optionOnClick = React.useCallback((event) => {
        if (typeof onSelect === 'function') {
            onSelect({
                value: event.currentTarget.dataset.value,
                reactEvent: event,
                nativeEvent: event.nativeEvent,
            });
        }
        closeMenu();
    }, [onSelect, closeMenu]);

    const mountedRef = React.useRef(false);
    React.useLayoutEffect(() => {
        if (mountedRef.current) {
            if (menuOpen) {
                if (typeof onOpen === 'function') onOpen();
            } else {
                if (typeof onClose === 'function') onClose();
            }
        }
        mountedRef.current = true;
    }, [menuOpen]);

    const renderLabel = React.useCallback((labelProps) => (
        <Button {...labelProps} onClick={labelOnClick}>
            {typeof renderLabelContent === 'function' ? renderLabelContent() : null}
            {labelProps.children}
        </Button>
    ), [labelOnClick, renderLabelContent]);

    const renderMenu = React.useCallback(() => (
        <div className={styles['menu-container']} onClick={menuOnClick}>
            {
                validOptions.length > 0 ?
                    validOptions.map(({ label, value }) => (
                        <Button key={value} className={styles['option-container']} title={typeof label === 'string' ? label : value} data-value={value} onClick={optionOnClick}>
                            <div className={styles['label']}>{typeof label === 'string' ? label : value}</div>
                        </Button>
                    ))
                    :
                    <div className={styles['no-options-container']}>
                        <div className={styles['label']}>{t('NO_OPTIONS')}</div>
                    </div>
            }
        </div>
    ), [validOptions, menuOnClick, optionOnClick, t]);

    return (
        <Popup
            {...props}
            className={className}
            open={menuOpen}
            onCloseRequest={closeMenu}
            renderLabel={renderLabel}
            renderMenu={renderMenu}
        />
    );
};

module.exports = Multiselect;
