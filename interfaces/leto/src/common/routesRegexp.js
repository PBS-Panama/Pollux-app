// PBS Crewing Module - Route definitions

const routesRegexp = {
    companyDashboard: {
        regexp: /^\/?(?:company-dashboard)?$/,
        urlParamsNames: []
    },
    companyCrewdb: {
        regexp: /^\/company-crewdb(?:\/([^/]*)\/([^/]*)\/([^/]*))?$/,
        urlParamsNames: ['transportUrl', 'type', 'catalogId']
    },
    companyCalendar: {
        regexp: /^\/company-calendar(?:\/([^/]*)\/([^/]*))?$/,
        urlParamsNames: ['year', 'month']
    },
    myFleet: {
        regexp: /^\/my-fleet$/,
        urlParamsNames: []
    },
    metadetails: {
        regexp: /^\/(?:metadetails|detail|crew)\/([^/]*)\/([^/]*)(?:\/([^/]*))?$/,
        urlParamsNames: ['type', 'id', 'documentId']
    },
    // R3: ruta propia del perfil de tripulante — reemplaza a `metadetails`
    // (heredada de Stremio) como destino real. `metadetails` se deja mapeada
    // al mismo componente (routerViewsConfig.js) para que ningun link/deep
    // link viejo con esa forma caiga en NotFound.
    seafarerProfile: {
        regexp: /^\/seafarer\/([^/]*)$/,
        urlParamsNames: ['id']
    },
    settings: {
        regexp: /^\/settings$/,
        urlParamsNames: []
    },
};

module.exports = routesRegexp;
