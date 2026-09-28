// PBS Crewing Module — router: matching puro, sin React
// Todo lo que se puede razonar sin un componente de por medio vive acá:
// encontrar qué routeConfig matchea un path, sacarle los parámetros
// nombrados, leer el hash actual, y decidir si dos sets de parámetros son
// "el mismo" (para no generar una entrada nueva cuando la ruta no cambió en
// los hechos).

const findRouteMatch = (viewsConfig, pathname) => {
    for (let levelIndex = 0; levelIndex < viewsConfig.length; levelIndex++) {
        const level = viewsConfig[levelIndex];
        for (let routeIndex = 0; routeIndex < level.length; routeIndex++) {
            const routeConfig = level[routeIndex];
            const match = pathname.match(routeConfig.regexp);
            if (match) {
                return { levelIndex, routeIndex, routeConfig, match };
            }
        }
    }
    return null;
};

const paramsFromMatch = (routeConfig, match, pathname) => {
    const params = { path: pathname };
    routeConfig.urlParamsNames.forEach((name, index) => {
        const raw = match[index + 1];
        params[name] = typeof raw === 'string' ? decodeURIComponent(raw) : null;
    });
    return params;
};

const currentPathname = () => window.location.hash.slice(1).split('?')[0] || '';

const sameParams = (a, b) => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length && aKeys.every((key) => a[key] === b[key]);
};

module.exports = { findRouteMatch, paramsFromMatch, currentPathname, sameParams };
