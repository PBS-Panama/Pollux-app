// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');

const detectStandalone = () => ([
    !!window.navigator.standalone,
    window.matchMedia('(display-mode: standalone)').matches,
]);

// Se lee una sola vez al montar: el modo standalone de una PWA no cambia
// durante el ciclo de vida de la pestaña.
const usePWA = () => {
    const [standalone] = React.useState(detectStandalone);
    return standalone;
};

module.exports = usePWA;
