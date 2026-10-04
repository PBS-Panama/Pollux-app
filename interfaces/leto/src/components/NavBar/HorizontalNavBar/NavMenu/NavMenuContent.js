// PBS Crewing Module — contenido del menú de perfil (R11, reescrito desde cero)
// Identidad real de Pollux: la sesión vive en localStorage['pollux-auth']/
// ['pollux-user'] (la escribe landing's LoginModal), no en ningún modelo de
// CoreTransport (que nunca tuvo cuenta de usuario real). Sin sesión, muestra
// "Anónimo" + link de login.

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('pollux/common/Icon');
const { Button } = require('pollux/components');
const { default: useFullscreen } = require('pollux/common/useFullscreen');
const usePWA = require('pollux/common/usePWA');
const styles = require('./styles');

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('pollux-user') || 'null');
    } catch {
        return null;
    }
};

const useStoredUser = () => {
    const [user] = React.useState(readStoredUser);
    const logOut = React.useCallback(() => {
        localStorage.removeItem('pollux-auth');
        localStorage.removeItem('pollux-user');
        window.location.href = '/';
    }, []);
    return { user, logOut };
};

const UserRow = ({ user, logOut, t }) => (
    <div className={styles['user-info-container']}>
        <div
            className={styles['avatar-container']}
            style={{ backgroundImage: `url('${require(user ? '/assets/images/default_avatar.png' : '/assets/images/anonymous.png')}')` }}
        />
        <div className={styles['user-info-details']}>
            <div className={styles['email-container']}>
                <div className={styles['email-label']}>{user ? user.email : t('ANONYMOUS_USER')}</div>
            </div>
            <Button
                className={styles['logout-button-container']}
                title={user ? t('LOG_OUT') : `${t('LOG_IN')} / ${t('SIGN_UP')}`}
                href={user ? undefined : '/'}
                onClick={user ? logOut : undefined}
            >
                <div className={styles['logout-label']}>{user ? t('LOG_OUT') : `${t('LOG_IN')} / ${t('SIGN_UP')}`}</div>
            </Button>
        </div>
    </div>
);

const NavMenuContent = ({ onClick }) => {
    const { t } = useTranslation();
    const [fullscreen, requestFullscreen, exitFullscreen] = useFullscreen();
    const [isIOSPWA, isAndroidPWA] = usePWA();
    const { user, logOut } = useStoredUser();
    const isStandalonePWA = isIOSPWA || isAndroidPWA;

    return (
        <div className={classnames(styles['nav-menu-container'], 'animation-fade-in')} onClick={onClick}>
            <UserRow user={user} logOut={logOut} t={t} />

            {!isStandalonePWA && (
                <div className={styles['nav-menu-section']}>
                    <Button
                        className={styles['nav-menu-option-container']}
                        title={fullscreen ? t('EXIT_FULLSCREEN') : t('ENTER_FULLSCREEN')}
                        onClick={fullscreen ? exitFullscreen : requestFullscreen}
                    >
                        <Icon className={styles['icon']} name={fullscreen ? 'minimize' : 'maximize'} />
                        <div className={styles['nav-menu-option-label']}>{fullscreen ? t('EXIT_FULLSCREEN') : t('ENTER_FULLSCREEN')}</div>
                    </Button>
                </div>
            )}

            {/* Addons ('#/myexams', ruta de Castor que no existe acá) y Play
                URL/Magnet (reproducción de torrents) no tienen sentido en un
                portal de gestión de tripulación — no están. */}
            <div className={styles['nav-menu-section']}>
                <Button className={styles['nav-menu-option-container']} title={t('SETTINGS')} href={'#/settings'}>
                    <Icon className={styles['icon']} name={'settings'} />
                    <div className={styles['nav-menu-option-label']}>{t('SETTINGS')}</div>
                </Button>
                <Button className={styles['nav-menu-option-container']} title={t('HELP_FEEDBACK')} href={'mailto:commercialaffairs@pbtradingsolutions.com'}>
                    <Icon className={styles['icon']} name={'help'} />
                    <div className={styles['nav-menu-option-label']}>{t('HELP_FEEDBACK')}</div>
                </Button>
            </div>
            {/* Términos/Privacidad/Panel de usuario apuntaban a las páginas
                legales de stremio.com — Pollux todavía no tiene las suyas;
                se agregan cuando existan, no antes. */}
        </div>
    );
};

NavMenuContent.propTypes = {
    onClick: PropTypes.func
};

module.exports = NavMenuContent;
