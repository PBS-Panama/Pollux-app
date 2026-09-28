// PBS Crewing Module — servicios (R11, reescrito desde cero; T2: sacado
// useServices — su único consumidor real, components/LibItem/LibItem.js, se
// borró junto con Library, MetaItem y Multiselect por decisión de Rick
// 2026-09-28)
// KeyboardShortcuts pasó de una clase EventEmitter con start()/stop() (que
// nadie escuchaba — ni 'stateChanged' ni `.active` tenían consumidor real) a
// un hook que se llama donde hace falta (hoy, solo App.js) y maneja su
// propio ciclo de vida con un efecto.

const React = require('react');

// Digit1-5 saltan a una pantalla real de Pollux. Se ignora con el foco en un
// <input> o con Ctrl/Alt/Shift/Meta apretado — eso también silenciaba
// Backspace con Ctrl en la versión anterior (el "adelante" con
// Ctrl+Backspace nunca podía dispararse ahí: el guard de arriba ya cortaba
// antes de llegar a ese caso), así que esa rama muerta no se repite acá.
const NAV_SHORTCUTS = {
    Digit1: '#/',
    Digit2: '#/company-crewdb',
    Digit3: '#/company-calendar',
    Digit4: '#/my-fleet',
    Digit5: '#/settings',
};

const useKeyboardShortcuts = () => {
    React.useEffect(() => {
        const onKeyDown = (event) => {
            if (event.target.tagName === 'INPUT' || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
                return;
            }
            if (event.code in NAV_SHORTCUTS) {
                event.preventDefault();
                window.location = NAV_SHORTCUTS[event.code];
            } else if (event.code === 'Backspace') {
                event.preventDefault();
                window.history.back();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
};

module.exports = { useKeyboardShortcuts };
