// PBS Crewing Module: Document Category navigation bar
// Replaces Stremio's SeasonsBar — navigates between document categories

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, MultiselectMenu } = require('leto/components');
const CategoryBarPlaceholder = require('./SeasonsBarPlaceholder');
const styles = require('./styles');

const { CREW_DOC_LABELS } = require('leto/common/crewDocData');

const CategoryBar = ({ className, categories, category, onSelect }) => {
    const options = React.useMemo(() => {
        return categories.map((cat) => ({
            value: String(cat),
            label: CREW_DOC_LABELS[cat] || `Category ${cat}`
        }));
    }, [categories]);
    const selectedCategory = React.useMemo(() => {
        return String(category);
    }, [category]);
    const prevNextButtonOnClick = React.useCallback((event) => {
        if (typeof onSelect === 'function') {
            const catIndex = categories.indexOf(category);
            const valueIndex = event.currentTarget.dataset.action === 'next' ?
                catIndex + 1 < categories.length ? catIndex + 1 : categories.length - 1
                :
                catIndex - 1 >= 0 ? catIndex - 1 : 0;
            const value = categories[valueIndex];
            onSelect({
                type: 'select',
                value: value,
                reactEvent: event,
                nativeEvent: event.nativeEvent
            });
        }
    }, [category, categories, onSelect]);
    const categoryOnSelect = React.useCallback((value) => {
        if (typeof onSelect === 'function') {
            onSelect({
                type: 'select',
                value: value,
            });
        }
    }, [onSelect]);

    const [prevDisabled, nextDisabled] = React.useMemo(() => {
        const currentIndex = categories.indexOf(category);
        return [
            currentIndex === 0,
            currentIndex === categories.length - 1
        ];
    }, [category, categories]);

    return (
        <div className={classnames(className, styles['seasons-bar-container'])}>
            <Button className={classnames(styles['prev-season-button'], { 'disabled': prevDisabled })} title={'Previous Category'} data-action={'prev'} onClick={prevNextButtonOnClick}>
                <Icon className={styles['icon']} name={'chevron-back'} />
                <div className={styles['label']}>{'Prev'}</div>
            </Button>
            <MultiselectMenu
                className={styles['seasons-popup-label-container']}
                options={options}
                title={CREW_DOC_LABELS[category] || `Category ${category}`}
                value={selectedCategory}
                onSelect={categoryOnSelect}
            />
            <Button className={classnames(styles['next-season-button'], { 'disabled': nextDisabled })} title={'Next Category'} data-action={'next'} onClick={prevNextButtonOnClick}>
                <div className={styles['label']}>{'Next'}</div>
                <Icon className={styles['icon']} name={'chevron-forward'} />
            </Button>
        </div>
    );
};

CategoryBar.Placeholder = CategoryBarPlaceholder;

CategoryBar.propTypes = {
    className: PropTypes.string,
    categories: PropTypes.arrayOf(PropTypes.number).isRequired,
    category: PropTypes.number.isRequired,
    onSelect: PropTypes.func
};

module.exports = CategoryBar;
