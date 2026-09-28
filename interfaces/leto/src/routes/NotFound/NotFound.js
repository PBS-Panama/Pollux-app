// PBS Crewing Module — página no encontrada (R11, reescrita desde cero)
// Usa MainNavBars (sidebar real) en vez de una barra sola sin navegación —
// si alguien cae acá por un link viejo/roto, que pueda irse a cualquier
// pantalla real con un click, no solo "atrás". Texto por el catálogo propio
// (en/es/pt), como el resto de la app.

const React = require('react');
const { useTranslation } = require('react-i18next');
const { MainNavBars } = require('pollux/components');
const styles = require('./styles');

const NotFound = () => {
    const { t } = useTranslation();
    return (
        <MainNavBars className={styles['page']}>
            <div className={styles['content']}>
                <div className={styles['code']}>404</div>
                <div className={styles['message']}>{t('NOT_FOUND_MESSAGE')}</div>
                <a className={styles['link']} href={'#/'}>{t('NOT_FOUND_BACK_LINK')}</a>
            </div>
        </MainNavBars>
    );
};

module.exports = NotFound;
