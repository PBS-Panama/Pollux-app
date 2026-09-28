// PBS Crewing Module — sidebar de navegación (R11, reescrito desde cero;
// R14: segunda pasada, otra descomposición)
// Logo + lista de pestañas de la empresa (App/routerViewsConfig.js define a
// dónde va cada una). El label de cada pestaña pasa por el catálogo de
// traducciones (algunas pestañas usan directamente el texto en inglés como
// clave — ver common/translations/*.json).

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const NavTabButton = require('./NavTabButton');
const styles = require('./styles');

const Brand = () => (
    <div className={styles['brand']}>
        <a href={'/'} className={styles['logo']} aria-label={'Pollux'}>
            <img className={styles['logo-icon']} src={'/favicon.svg'} alt={''} />
            <span className={styles['logo-text']}>Pollux</span>
        </a>
    </div>
);

// Cada `tab` ya trae la forma exacta que espera NavTabButton
// (id/label/logo/icon/href/onClick) — se le pasa entero por spread en vez de
// listar cada campo, y se pisan encima los dos que dependen del estado del
// sidebar (`selected`, y `label` ya traducido).
const NavTabs = ({ tabs, selected, t }) => (
    <ul className={styles['navbar-nav']}>
        <li className={styles['menu-label']}>
            <span>{t('MENU') || 'Menu'}</span>
        </li>
        {Array.isArray(tabs) && tabs.map((tab) => (
            <li key={tab.id} className={classnames(styles['nav-item'], { [styles['active']]: tab.id === selected })}>
                <NavTabButton
                    {...tab}
                    className={styles['nav-tab-button']}
                    selected={tab.id === selected}
                    label={t(tab.label)}
                />
            </li>
        ))}
    </ul>
);

const VerticalNavBar = React.memo(({ className, selected, tabs, collapsed }) => {
    const { t } = useTranslation();
    return (
        <nav className={classnames(className, styles['vertical-nav-bar-container'], { [styles['collapsed']]: collapsed })}>
            <Brand />
            <div className={styles['startbar-menu']}>
                <NavTabs tabs={tabs} selected={selected} t={t} />
            </div>
        </nav>
    );
});

VerticalNavBar.displayName = 'VerticalNavBar';

VerticalNavBar.propTypes = {
    className: PropTypes.string,
    selected: PropTypes.string,
    collapsed: PropTypes.bool,
    tabs: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string,
        logo: PropTypes.string,
        icon: PropTypes.string,
        href: PropTypes.string,
        onClick: PropTypes.func
    }))
};

module.exports = VerticalNavBar;
