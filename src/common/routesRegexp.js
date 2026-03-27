// PBS Crewing Module - Route definitions

const routesRegexp = {
    intro: {
        regexp: /^\/intro$/,
        urlParamsNames: []
    },
    companyDashboard: {
        regexp: /^\/?(?:company-dashboard)?$/,
        urlParamsNames: []
    },
    companyCrewdb: {
        regexp: /^\/company-crewdb(?:\/([^/]*)\/([^/]*)\/([^/]*))?$/,
        urlParamsNames: ['transportUrl', 'type', 'catalogId']
    },
    myfiles: {
        regexp: /^\/myfiles(?:\/([^/]*))?$/,
        urlParamsNames: ['type']
    },
    companyCalendar: {
        regexp: /^\/company-calendar(?:\/([^/]*)\/([^/]*))?$/,
        urlParamsNames: ['year', 'month']
    },
    calendar: {
        regexp: /^\/calendar(?:\/([^/]*)\/([^/]*))?$/,
        urlParamsNames: ['year', 'month']
    },
    continuewatching: {
        regexp: /^\/continuewatching(?:\/([^/]*))?$/,
        urlParamsNames: ['type']
    },
    search: {
        regexp: /^\/search$/,
        urlParamsNames: []
    },
    metadetails: {
        regexp: /^\/(?:metadetails|detail|crew)\/([^/]*)\/([^/]*)(?:\/([^/]*))?$/,
        urlParamsNames: ['type', 'id', 'documentId']
    },
    myexams: {
        regexp: /^\/myexams(?:\/([^/]*)(?:\/([^/]*)\/([^/]*))?)?$/,
        urlParamsNames: ['type', 'transportUrl', 'catalogId']
    },
    myprofile: {
        regexp: /^\/my-profile$/,
        urlParamsNames: []
    },
    settings: {
        regexp: /^\/settings$/,
        urlParamsNames: []
    },
    dashboard: {
        regexp: /^\/dashboard$/,
        urlParamsNames: []
    }
};

module.exports = routesRegexp;
