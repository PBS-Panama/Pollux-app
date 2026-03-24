// PBS Crewing Module: Document category selector from URL query params
// Replaces Stremio's season concept with maritime document categories

const React = require('react');

const useCategory = (urlParams, queryParams) => {
    const category = React.useMemo(() => {
        return queryParams.has('category') && !isNaN(queryParams.get('category')) ?
            parseInt(queryParams.get('category'), 10)
            :
            // Backward compat: also check old 'season' param
            queryParams.has('season') && !isNaN(queryParams.get('season')) ?
                parseInt(queryParams.get('season'), 10)
                :
                null;
    }, [queryParams]);
    const setCategory = React.useCallback((cat) => {
        const nextQueryParams = new URLSearchParams(queryParams);
        nextQueryParams.set('category', cat);
        nextQueryParams.delete('season'); // clean up old param
        const path = urlParams.path.endsWith('/') ?
            urlParams.path.slice(0, -1):
            urlParams.path;

        window.location.replace(`#${path}?${nextQueryParams}`);
    }, [urlParams, queryParams]);
    return [category, setCategory];
};

module.exports = useCategory;
