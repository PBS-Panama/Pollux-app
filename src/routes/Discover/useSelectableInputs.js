// Copyright (C) 2017-2023 Smart code 203358507
// PBS Crewing Module: multi-select checkbox filters with client-side filtering

const React = require('react');

const VISA_OPTIONS = [
    { label: 'Has visa', value: 'has_visa' },
    { label: 'No visa', value: 'no_visa' },
    { label: 'Double nationality', value: 'double_nationality' },
    { label: 'Visa linked to Passport 1', value: 'linked_passport_1' },
    { label: 'Visa linked to Passport 2', value: 'linked_passport_2' },
];

const useSelectableInputs = (crewItems) => {
    // State: sets of selected values for each filter category
    const [selectedDepts, setSelectedDepts] = React.useState(new Set());
    const [selectedRanks, setSelectedRanks] = React.useState(new Set());
    const [selectedNats, setSelectedNats] = React.useState(new Set());
    const [selectedVisas, setSelectedVisas] = React.useState(new Set());

    const deptOptions = React.useMemo(() => {
        const unique = Array.from(new Set((crewItems || []).map((item) => item.department).filter(Boolean)));
        return unique.sort((a, b) => a.localeCompare(b)).map((label) => ({ label, value: label }));
    }, [crewItems]);

    const rankOptions = React.useMemo(() => {
        const unique = Array.from(new Set((crewItems || []).map((item) => item.rank).filter(Boolean)));
        return unique.sort((a, b) => a.localeCompare(b)).map((label) => ({ label, value: label }));
    }, [crewItems]);

    const natOptions = React.useMemo(() => {
        const unique = Array.from(new Set((crewItems || []).map((item) => item.nationality).filter(Boolean)));
        return unique.sort((a, b) => a.localeCompare(b)).map((label) => ({ label, value: label }));
    }, [crewItems]);

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
    const toggleVisa = React.useCallback((value) => {
        setSelectedVisas((prev) => {
            const next = new Set(prev);
            next.has(value) ? next.delete(value) : next.add(value);
            return next;
        });
    }, []);

    // Build selector objects with multicheck props
    const deptInput = React.useMemo(() => ({
        title: () => 'Department',
        options: deptOptions,
        multicheck: true,
        selectedValues: selectedDepts,
        onToggle: toggleDept,
        onSelect: () => {},
        value: undefined,
    }), [deptOptions, selectedDepts, toggleDept]);

    const rankInput = React.useMemo(() => ({
        title: () => 'Rank',
        options: rankOptions,
        multicheck: true,
        selectedValues: selectedRanks,
        onToggle: toggleRank,
        onSelect: () => {},
        value: undefined,
    }), [rankOptions, selectedRanks, toggleRank]);

    const natInput = React.useMemo(() => ({
        title: () => 'Nationality',
        options: natOptions,
        multicheck: true,
        selectedValues: selectedNats,
        onToggle: toggleNat,
        onSelect: () => {},
        value: undefined,
    }), [natOptions, selectedNats, toggleNat]);

    const visaInput = React.useMemo(() => ({
        title: () => 'Mobility / Visa',
        options: VISA_OPTIONS,
        multicheck: true,
        selectedValues: selectedVisas,
        onToggle: toggleVisa,
        onSelect: () => {},
        value: undefined,
    }), [selectedVisas, toggleVisa]);

    const selectInputs = React.useMemo(
        () => [deptInput, rankInput, natInput, visaInput],
        [deptInput, rankInput, natInput, visaInput]
    );

    // Client-side filter: AND across categories, OR within a category
    const filterItem = React.useCallback((item) => {
        if (selectedDepts.size > 0 && !selectedDepts.has(item.department)) return false;
        if (selectedRanks.size > 0 && !selectedRanks.has(item.rank)) return false;
        if (selectedNats.size > 0 && !selectedNats.has(item.nationality)) return false;
        if (selectedVisas.size > 0) {
            const mob = item.mobility || {};
            // OR within visa category: item passes if ANY selected flag matches.
            let anyMatch = false;
            if (selectedVisas.has('has_visa') && mob.has_visa) anyMatch = true;
            if (selectedVisas.has('no_visa') && !mob.has_visa) anyMatch = true;
            if (selectedVisas.has('double_nationality') && mob.double_nationality) anyMatch = true;
            if (selectedVisas.has('linked_passport_1') && mob.linked_passport === 'passport_1') anyMatch = true;
            if (selectedVisas.has('linked_passport_2') && mob.linked_passport === 'passport_2') anyMatch = true;
            if (!anyMatch) return false;
        }
        return true;
    }, [selectedDepts, selectedRanks, selectedNats, selectedVisas]);

    const hasNextPage = false;

    return [selectInputs, hasNextPage, filterItem];
};

module.exports = useSelectableInputs;
