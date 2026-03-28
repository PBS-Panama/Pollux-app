// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const useModelState = require('leto/common/useModelState');
const { useServices } = require('leto/services');

const useSearchHistory = () => {
    const { core } = useServices();
    const { searchHistory: items } = useModelState({ model: 'ctx' });

    const clear = React.useCallback(() => {
        core.transport.dispatch({
            action: 'Ctx',
            args: {
                action: 'ClearSearchHistory',
            },
        });
    }, []);

    return {
        items,
        clear,
    };
};

module.exports = useSearchHistory;
