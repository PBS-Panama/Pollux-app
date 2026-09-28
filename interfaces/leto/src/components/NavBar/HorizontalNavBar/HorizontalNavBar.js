// PBS Crewing Module — barra superior (R11, reescrito desde cero)
// Botón atrás/toggle de sidebar a la izquierda, pantalla completa + campana
// de notificaciones + menú de perfil a la derecha. (El `title` del original
// no tiene ningún consumidor real — SeafarerProfile y MainNavBars, los dos
// únicos llamadores, no lo pasan — así que se eliminó.)

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('pollux/common/Icon');
const { Button } = require('pollux/components');
const { default: useFullscreen } = require('pollux/common/useFullscreen');
const usePWA = require('pollux/common/usePWA');
const NavMenu = require('./NavMenu');
const { default: NotificationBell } = require('./NotificationBell');
const styles = require('./styles');
const { t } = require('i18next');

const LeftControl = ({ backButton, sidebarCollapsed, onToggleSidebar }) => {
    if (backButton) {
        return (
            <Button className={classnames(styles['button-container'], styles['back-button-container'])} tabIndex={-1} onClick={() => window.history.back()}>
                <Icon className={styles['icon']} name={'chevron-back'} />
            </Button>
        );
    }
    if (typeof onToggleSidebar === 'function') {
        return (
            <Button className={classnames(styles['button-container'], styles['sidebar-toggle-container'])} title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'} tabIndex={-1} onClick={onToggleSidebar}>
                <i className={classnames(styles['icon'], 'iconoir-menu')} />
            </Button>
        );
    }
    return null;
};

const HorizontalNavBar = React.memo(({ className, backButton, fullscreenButton, navMenu, notificationBell, sidebarCollapsed, onToggleSidebar, ...props }) => {
    const [fullscreen, requestFullscreen, exitFullscreen] = useFullscreen();
    const [isIOSPWA] = usePWA();

    const renderProfileLabel = React.useCallback(({ ref, className, onClick, children }) => (
        <Button ref={ref} className={classnames(className, styles['button-container'], styles['menu-button-container'])} tabIndex={-1} onClick={onClick}>
            <Icon className={styles['icon']} name={'person-outline'} />
            {children}
        </Button>
    ), []);

    return (
        <nav {...props} className={classnames(className, styles['horizontal-nav-bar-container'])}>
            <LeftControl backButton={backButton} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={onToggleSidebar} />

            <div className={styles['buttons-container']}>
                {!isIOSPWA && fullscreenButton && (
                    <Button
                        className={styles['button-container']}
                        title={fullscreen ? t('EXIT_FULLSCREEN') : t('ENTER_FULLSCREEN')}
                        tabIndex={-1}
                        onClick={fullscreen ? exitFullscreen : requestFullscreen}
                    >
                        <Icon className={styles['icon']} name={fullscreen ? 'minimize' : 'maximize'} />
                    </Button>
                )}
                {notificationBell && <NotificationBell />}
                {navMenu && <NavMenu renderLabel={renderProfileLabel} />}
            </div>
        </nav>
    );
});

HorizontalNavBar.displayName = 'HorizontalNavBar';

HorizontalNavBar.propTypes = {
    className: PropTypes.string,
    backButton: PropTypes.bool,
    fullscreenButton: PropTypes.bool,
    navMenu: PropTypes.bool,
    notificationBell: PropTypes.bool
};

module.exports = HorizontalNavBar;
