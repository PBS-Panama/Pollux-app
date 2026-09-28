// Company interface — only company-side routes.
// Seafarer-only routes (Addons/myexams, Compliance, MyProfile, Player/SeafarerSchedule,
// SeafarerCalendar) are excluded to keep the bundle lean.

const CompanyDashboard = require('./CompanyDashboard');
const SeafarerSearch = require('./SeafarerSearch');
const Library = require('./Library');
const Calendar = require('./Calendar').default;
const SeafarerProfile = require('./SeafarerProfile');
const NotFound = require('./NotFound');
const { default: Settings } = require('./Settings');
const MyFleet = require('./MyFleet');

module.exports = {
    CompanyDashboard,
    SeafarerSearch,
    Library,
    Calendar,
    SeafarerProfile,
    NotFound,
    Settings,
    MyFleet
};
