// PBS Crewing Module — servicios (R11, reescrito desde cero)
// No queda ningún servicio real que compartir vía React Context: nadie salvo
// components/LibItem/LibItem.js (congelado, pendiente de tu decisión sobre
// Library) sigue pidiendo "servicios", y solo lee core.transport.dispatch —
// un no-op desde antes de que CoreTransport se borrara (R8). Sin Context ni
// Provider: useServices() devuelve siempre el mismo objeto constante.
// KeyboardShortcuts pasó de una clase EventEmitter con start()/stop() (que
// nadie escuchaba — ni 'stateChanged' ni `.active` tenían consumidor real) a
// un hook que se llama donde hace falta (hoy, solo App.js) y maneja su
// propio ciclo de vida con un efecto.

const React = require('react');

const CORE_STUB = { transport: { dispatch: () => {} } };

const useServices = () => ({ core: CORE_STUB });

// Digit1-6 saltan a una pantalla real de Pollux. Se ignora con el foco en un
// <input> o con Ctrl/Alt/Shift/Meta apretado — eso también silenciaba
// Backspace con Ctrl en la versión anterior (el "adelante" con
// Ctrl+Backspace nunca podía dispararse ahí: el guard de arriba ya cortaba
// antes de llegar a ese caso), así que esa rama muerta no se repite acá.
const NAV_SHORTCUTS = {
    Digit1: '#/',
    Digit2: '#/company-crewdb',
    Digit3: '#/myfiles',
    Digit4: '#/company-calendar',
    Digit5: '#/my-fleet',
    Digit6: '#/settings',
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

module.exports = { useServices, useKeyboardShortcuts };
