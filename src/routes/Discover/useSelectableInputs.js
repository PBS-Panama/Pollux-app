// Copyright (C) 2017-2023 Smart code 203358507
// PBS Crewing Module: multi-select checkbox filters with client-side filtering

const React = require('react');
const { getCrewDepartment, getCrewRank, getCrewNationality,
    STCW_DEPARTMENTS, STCW_RANKS, NATIONALITIES_AMERICAS } = require('leto/common/crewData');

const useSelectableInputs = (discover) => {
    // State: sets of selected values for each filter category
    const [selectedDepts, setSelectedDepts] = React.useState(new Set());
    const [selectedRanks, setSelectedRanks] = React.useState(new Set());
    const [selectedNats, setSelectedNats] = React.useState(new Set());

    // Toggle helpers
    const toggleDept = React.useCallback((value) => {
        setSelectedDepts((prev) => {
            const next = new Set(prev);
            next.has(value) ? next.delete(value) : next.add(value);
            return next;
        });
    }, []);
    const toggleRank = React.useCallback((value) => {
        setSelectedRanks((prev) => {
            const next = new Set(prev);
            next.has(value) ? next.delete(value) : next.add(value);
            return next;
        });
    }, []);
    const toggleNat = React.useCallback((value) => {
        setSelectedNats((prev) => {
            const next = new Set(prev);
            next.has(value) ? next.delete(value) : next.add(value);
            return next;
        });
    }, []);

    // Build selector objects with multicheck props
    const deptInput = React.useMemo(() => ({
        title: () => 'Department',
        options: STCW_DEPARTMENTS.map((label) => ({ label, value: label })),
        multicheck: true,
        selectedValues: selectedDepts,
        onToggle: toggleDept,
        onSelect: () => {},
        value: undefined,
    }), [selectedDepts, toggleDept]);

    const rankInput = React.useMemo(() => ({
        title: () => 'Rank',
        options: STCW_RANKS.map((label) => ({ label, value: label })),
        multicheck: true,
        selectedValues: selectedRanks,
        onToggle: toggleRank,
        onSelect: () => {},
        value: undefined,
    }), [selectedRanks, toggleRank]);

    const natInput = React.useMemo(() => ({
        title: () => 'Nationality',
        options: NATIONALITIES_AMERICAS.map((label) => ({ label, value: label })),
        multicheck: true,
        selectedValues: selectedNats,
        onToggle: toggleNat,
        onSelect: () => {},
        value: undefined,
    }), [selectedNats, toggleNat]);

    const selectInputs = React.useMemo(() => [deptInput, rankInput, natInput], [deptInput, rankInput, natInput]);

    // Client-side filter: AND across categories, OR within a category
    const filterItem = React.useCallback((originalName) => {
        if (selectedDepts.size > 0 && !selectedDepts.has(getCrewDepartment(originalName))) return false;
        if (selectedRanks.size > 0 && !selectedRanks.has(getCrewRank(originalName))) return false;
        if (selectedNats.size > 0 && !selectedNats.has(getCrewNationality(originalName))) return false;
        return true;
    }, [selectedDepts, selectedRanks, selectedNats]);

    const hasNextPage = discover.selectable?.nextPage;

    return [selectInputs, hasNextPage, filterItem];
};

module.exports = useSelectableInputs;
