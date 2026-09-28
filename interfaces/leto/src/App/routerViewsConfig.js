// Company interface — route-to-component mapping (company tabs only).
// Seafarer-only routes (dashboard/SeafarerSchedule, calendar/SeafarerCalendar,
// myprofile, myexams, compliance) are intentionally excluded.

const routes = require('pollux/routes');
const { routesRegexp } = require('pollux/common');

const routerViewsConfig = [
    [
        {
            ...routesRegexp.companyDashboard,
            component: routes.CompanyDashboard
        }
    ],
    [
        {
            ...routesRegexp.companyCrewdb,
            component: routes.SeafarerSearch
        },
        {
            ...routesRegexp.companyCalendar,
            component: routes.Calendar
        },
        {
            ...routesRegexp.myFleet,
            component: routes.MyFleet
        }
    ],
    [
        {
            ...routesRegexp.seafarerProfile,
            component: routes.SeafarerProfile
        },
        {
            // R3: `metadetails` es la forma vieja de link (heredada de
            // Stremio, `#/metadetails/crew/{id}`) — se deja mapeada al mismo
            // componente nuevo para que ningun deep link/bookmark viejo
            // caiga en NotFound.
            ...routesRegexp.metadetails,
            component: routes.SeafarerProfile
        }
    ],
    [
        {
            ...routesRegexp.settings,
            component: routes.Settings
        }
    ]
];

module.exports = routerViewsConfig;
