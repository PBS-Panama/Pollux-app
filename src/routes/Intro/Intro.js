// Leto Crewing Module — Auth Gate
// Replaces the legacy Stremio login screen.
//
// Behaviour:
//   • Inside iframe (Dashboard embeds /app/) → skip directly to the crewing module
//   • Direct access to /app/ → send user to the Leto landing page

const React = require('react');

const Intro = () => {
    React.useEffect(() => {
        if (window.self !== window.top) {
            // Running inside the Dashboard iframe — just enter the app
            window.location = '#/company-dashboard';
        } else {
            // Accessed directly — redirect to the Leto landing page
            window.top.location.href = '/';
        }
    }, []);

    return null;
};

module.exports = Intro;
