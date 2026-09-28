// PBS Crewing Module — router: los dos contextos por nivel de vista
// RouteFocused le dice a un componente si su nivel quedó "arriba del todo"
// del stack (ver Router.js) — Popup/ModalDialog/NavMenu lo usan para no
// reaccionar a teclado/click-afuera cuando otra pantalla se abrió encima.
// ModalsContainer resuelve dónde debe pintarse un <Modal> (Modal.js): dentro
// del nivel que lo abrió, no en un contenedor global compartido por todo el
// stack de rutas.

const React = require('react');

const RouteFocusedContext = React.createContext(true);
RouteFocusedContext.displayName = 'RouteFocusedContext';
const useRouteFocused = () => React.useContext(RouteFocusedContext);

const ModalsContainerContext = React.createContext(null);
ModalsContainerContext.displayName = 'ModalsContainerContext';
const useModalsContainer = () => React.useContext(ModalsContainerContext);

const ModalsContainerProvider = ({ children }) => {
    const [container, setContainer] = React.useState(null);
    return (
        <ModalsContainerContext.Provider value={container}>
            {container instanceof HTMLElement ? children : null}
            <div ref={setContainer} className={'modals-container'} />
        </ModalsContainerContext.Provider>
    );
};

module.exports = {
    RouteFocusedProvider: RouteFocusedContext.Provider,
    useRouteFocused,
    ModalsContainerProvider,
    useModalsContainer,
};
