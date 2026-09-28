// Copyright (C) 2017-2023 Smart code 203358507

const Bowser = require('bowser');
const React = require('react');
const ReactDOM = require('react-dom/client');
const i18n = require('i18next');
const { initReactI18next } = require('react-i18next');
const { applyStoredTheme } = require('./common/theme');
const App = require('./App');

const initSentry = () => {
    if (typeof process.env.SENTRY_DSN === 'string') {
        require('@sentry/browser').init({ dsn: process.env.SENTRY_DSN });
    }
};

// En desktop no hace falta el viewport táctil (evita el zoom-al-enfocar de
// mobile en pantallas que en realidad son de escritorio).
const disableTouchViewportOnDesktop = () => {
    const { platform } = Bowser.parse(window.navigator?.userAgent || '');
    if (platform?.type === 'desktop') {
        document.querySelector('meta[name="viewport"]')?.setAttribute('content', '');
    }
};

// PBS Crewing Module: catálogo propio (Fase 4, limpieza Stremio/GPL) —
// reemplaza el viejo paquete de traducciones de Stremio. Solo los 3 idiomas
// que Pollux ofrece hoy (interfaceLanguages.json); la clave es el código de
// locale porque es lo que Settings > Interface guarda en
// profile.settings.interfaceLanguage y lo que App.js le pasa a
// i18n.changeLanguage().
const initI18n = () => i18n.use(initReactI18next).init({
    resources: {
        'en-US': { translation: require('./common/translations/en.json') },
        'es-ES': { translation: require('./common/translations/es.json') },
        'pt-BR': { translation: require('./common/translations/pt.json') },
    },
    lng: 'en-US',
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
});

const renderApp = () => {
    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(<App />);
};

const registerServiceWorker = () => {
    const disabled = process.env.SERVICE_WORKER_DISABLED === 'true' || process.env.SERVICE_WORKER_DISABLED === true;
    if (process.env.NODE_ENV !== 'production' || disabled || !('serviceWorker' in navigator)) {
        return;
    }
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch((registrationError) => {
            console.error('SW registration failed: ', registrationError);
        });
    });
};

initSentry();
applyStoredTheme();
disableTouchViewportOnDesktop();
initI18n();
renderApp();
registerServiceWorker();
