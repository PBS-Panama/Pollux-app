// PBS Crewing Module - Route-to-Component mapping

const routes = require('stremio/routes');
const { routesRegexp } = require('stremio/common');

const routerViewsConfig = [
    [
        {
            ...routesRegexp.companyDashboard,
            component: routes.Board
        }
    ],
    [
        {
            ...routesRegexp.intro,
            component: routes.Intro
        },
        {
            ...routesRegexp.companyCrewdb,
            component: routes.Discover
        },
        {
            ...routesRegexp.myfiles,
            component: routes.Library
        },
        {
            ...routesRegexp.companyCalendar,
            component: routes.Calendar
        },
        {
            ...routesRegexp.calendar,
            component: routes.SeafarerCalendar
        },
        {
            ...routesRegexp.search,
            component: routes.Search
        },
        {
            ...routesRegexp.dashboard,
            component: routes.Player
        }
    ],
    [
        {
            ...routesRegexp.metadetails,
            component: routes.MetaDetails
        }
    ],
    [
        {
            ...routesRegexp.myprofile,
            component: routes.MyProfile
        },
        {
            ...routesRegexp.myexams,
            component: routes.Addons
        },
        {
            ...routesRegexp.settings,
            component: routes.Settings
        }
    ]
];

module.exports = routerViewsConfig;
