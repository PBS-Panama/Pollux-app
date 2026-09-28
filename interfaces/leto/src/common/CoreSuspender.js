// PBS Crewing Module — mount-delay wrapper (R8)
// The original wrapped every route in a React.Suspense boundary backed by
// CoreTransport's async getState()/decodeStream() (the "throw a promise"
// trick) so a route could suspend while its model loaded. Nothing suspends
// on anything anymore — useModelState.js (the only consumer of that
// suspense context) is gone, its 2 real consumers were data_export (dead,
// no UI ever used it) and ctx (replaced by direct localStorage in
// useProfile.js). Kept only what's still load-bearing for its 4 real
// consumers (Library/Settings/NavMenuContent/the router): render the
// Fallback for one tick, then the real component.

const React = require('react');

// eslint-disable-next-line @typescript-eslint/no-empty-function
const withCoreSuspender = (Component, Fallback = () => null) => {
    return function WithCoreSuspender(props) {
        const [render, setRender] = React.useState(false);
        React.useLayoutEffect(() => {
            setRender(true);
        }, []);
        return render ? <Component {...props} /> : <Fallback {...props} />;
    };
};

module.exports = { withCoreSuspender };
