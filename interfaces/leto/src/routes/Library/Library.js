// PBS Crewing Module: Seafarer Document Upload page

const React = require('react');
const classnames = require('classnames');
const { withCoreSuspender } = require('pollux/common');
const { default: Button } = require('pollux/components/Button');
const { MainNavBars } = require('pollux/components');
const useDocumentUpload = require('./useDocumentUpload');
const styles = require('./styles');

const Library = () => {
    const {
        categories,
        categoryLabels,
        selectedCategory,
        setSelectedCategory,
    } = useDocumentUpload();

    return (
        <MainNavBars className={styles['library-container']} route={'myfiles'}>
            {
                <div className={styles['library-content']}>
                    {/* Left sidebar: category list */}
                    <div className={styles['category-sidebar']}>
                        <div className={styles['sidebar-title']}>{'Document Categories'}</div>
                        {categories.map((catId) => (
                            <Button
                                key={catId}
                                className={classnames(styles['category-item'], {
                                    [styles['active']]: catId === selectedCategory
                                })}
                                onClick={() => setSelectedCategory(catId)}
                            >
                                <div className={classnames(styles['category-dot'], {
                                    [styles['active']]: catId === selectedCategory
                                })} />
                                <div className={styles['category-label']}>
                                    {categoryLabels[catId]}
                                </div>
                            </Button>
                        ))}
                    </div>

                    {/* Right content area */}
                    <div className={styles['upload-area']}>
                        <div className={styles['uploads-empty']}>
                            {'Subida de documentos: próximamente'}
                        </div>
                    </div>
                </div>
            }
        </MainNavBars>
    );
};

const LibraryFallback = () => (
    <MainNavBars className={styles['library-container']} route={'myfiles'} />
);

module.exports = withCoreSuspender(Library, LibraryFallback);
