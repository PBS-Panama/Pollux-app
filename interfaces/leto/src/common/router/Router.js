// PBS Crewing Module — router propio (R11: reescrito de verdad, no
// reorganizado — ver notas-pendientes-2026-09-28.md)
// Ruteo por hash (#/...), sin librería externa. App/routerViewsConfig.js
// agrupa las rutas en "niveles" (0 = Dashboard, 1 = Crew Database/My
// Files/Calendar/My Fleet, 2 = perfil de marino, 3 = Settings). Navegar a
// una ruta de un nivel más profundo NO desmonta los niveles anteriores —
// quedan montados pero ocultos por CSS (styles.css,
// `.route-container:not(:last-child)`), así "atrás" no pierde su estado
// (scroll, filtros). `queryParams` no tenía ningún consumidor real (grep en
// todo routes/ y components/) y se eliminó junto con `onRouteChange`, que
// tampoco lo llamaba nadie.

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { RouteFocusedProvider, ModalsContainerProvider } = require('./context');
const { findRouteMatch, paramsFromMatch, currentPathname, sameParams } = require('./routeMatching');

const nextViews = (previousViews, viewsConfig, pathname) => {
    const found = findRouteMatch(viewsConfig, pathname);
    if (found === null) {
        return null;
    }

    const { levelIndex, routeIndex, routeConfig, match } = found;
    const urlParams = paramsFromMatch(routeConfig, match, pathname);
    const previousAtLevel = previousViews[levelIndex];
    const unchanged = previousAtLevel !== null
        && previousAtLevel.key === `${levelIndex}-${routeIndex}`
        && sameParams(previousAtLevel.urlParams, urlParams);

    return previousViews.map((view, index) => {
        if (index < levelIndex) return view;
        if (index !== levelIndex) return null;
        return unchanged ? previousAtLevel : { key: `${levelIndex}-${routeIndex}`, component: routeConfig.component, urlParams };
    });
};

// Cada nivel montado vive dentro de su propio contenedor de modales — así un
// <ModalDialog> abierto en un nivel no se pisa con el de otro apilado debajo.
const RouteLevel = ({ children }) => (
    <div className={'route-container'}>
        <ModalsContainerProvider>
            <div className={'route-content'}>
                {children}
            </div>
        </ModalsContainerProvider>
    </div>
);

const Router = ({ className, viewsConfig, onPathNotMatch }) => {
    const [views, setViews] = React.useState(() => Array(viewsConfig.length).fill(null));

    React.useLayoutEffect(() => {
        const syncWithHash = () => {
            setViews((previousViews) => {
                const matched = nextViews(previousViews, viewsConfig, currentPathname());
                if (matched !== null) {
                    return matched;
                }
                const component = typeof onPathNotMatch === 'function' ? onPathNotMatch() : null;
                return component
                    ? previousViews.slice(0, viewsConfig.length).concat({ key: 'not-found', component })
                    : previousViews;
            });
        };
        window.addEventListener('hashchange', syncWithHash);
        syncWithHash();
        return () => window.removeEventListener('hashchange', syncWithHash);
    }, [viewsConfig, onPathNotMatch]);

    const activeViews = views.filter((view) => view !== null);

    return (
        <div className={classnames(className, 'routes-container')}>
            {activeViews.map(({ key, component, urlParams }, index) => (
                <RouteFocusedProvider key={key} value={index === activeViews.length - 1}>
                    <RouteLevel>
                        {React.createElement(component, { urlParams })}
                    </RouteLevel>
                </RouteFocusedProvider>
            ))}
        </div>
    );
};

Router.propTypes = {
    className: PropTypes.string,
    onPathNotMatch: PropTypes.func,
    viewsConfig: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.exact({
        regexp: PropTypes.instanceOf(RegExp).isRequired,
        urlParamsNames: PropTypes.arrayOf(PropTypes.string).isRequired,
        component: PropTypes.elementType.isRequired
    }))).isRequired
};

module.exports = Router;
