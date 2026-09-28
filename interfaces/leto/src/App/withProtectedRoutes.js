// Stremio auth removed — Leto does not use Stremio user accounts.
// Pure passthrough — all routes are accessible directly.

const React = require('react');

const withProtectedRoutes = (Component) => {
    return function withProtectedRoutes(props) {
        return React.createElement(Component, props);
    };
};

module.exports = withProtectedRoutes;
