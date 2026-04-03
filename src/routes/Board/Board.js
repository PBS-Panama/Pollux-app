// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { withCoreSuspender } = require('leto/common');
const { MainNavBars } = require('leto/components');
const styles = require('./styles');
const CompanyHome = require('./CompanyHome');
const SeafarerHome = require('./SeafarerHome');

const getUserRole = () => {
    try {
        const data = localStorage.getItem('leto-user');
        if (data) return JSON.parse(data).role || 'seafarer';
    } catch { /* silent */ }
    return 'seafarer';
};

const Board = () => {
    const role = getUserRole();

    // Company users get their own dashboard
    if (role === 'company') {
        return (
            <div className={styles['board-container']}>
                <MainNavBars className={styles['board-content-container']} route={'companyDashboard'}>
                    <CompanyHome />
                </MainNavBars>
            </div>
        );
    }

    // Seafarers get their own operational dashboard home.
    return (
        <div className={styles['board-container']}>
            <MainNavBars className={styles['board-content-container']} route={'companyDashboard'}>
                <SeafarerHome />
            </MainNavBars>
        </div>
    );
};

const BoardFallback = () => (
    <div className={styles['board-container']}>
        <MainNavBars className={styles['board-content-container']} route={'companyDashboard'} />
    </div>
);

module.exports = withCoreSuspender(Board, BoardFallback);
