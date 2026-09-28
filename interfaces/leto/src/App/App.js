// PBS Crewing Module — app shell
// R8: no more Core/CoreTransport — nothing async to wait on before
// rendering, nothing that can put the app into an error state, so no
// loading gate and no ErrorDialog. Persisted UI language is applied at
// i18n.init() time (src/index.js), not an on-mount effect here.
// R11: no more services Context/Provider either — useKeyboardShortcuts is a
// self-contained hook (services/index.js) called directly here. Toast/Tooltip
// providers removed in R11 — both were 100% dead (SharePrompt, their only
// real consumer, was deleted in R7). T2 (2026-09-28): useServices() itself
// removed — its only real consumer, components/LibItem, was deleted with
// Library by Rick's decision.

const React = require('react');
const { Router } = require('pollux/common/router');
const { useKeyboardShortcuts } = require('pollux/services');
const { NotFound } = require('pollux/routes');
const { PlatformProvider, ShortcutsProvider, withCoreSuspender, useBinaryState } = require('pollux/common');
const { default: ShortcutsModal } = require('./ShortcutsModal');
const withProtectedRoutes = require('./withProtectedRoutes');
const routerViewsConfig = require('./routerViewsConfig');
const styles = require('./styles');

const RouterWithProtectedRoutes = withCoreSuspender(withProtectedRoutes(Router));

const App = () => {
    const onPathNotMatch = React.useCallback(() => {
        return NotFound;
    }, []);
    const [shortcutModalOpen,, closeShortcutsModal, toggleShortcutModal] = useBinaryState(false);

    const onShortcut = React.useCallback((name) => {
        if (name === 'shortcuts') {
            toggleShortcutModal();
        }
    }, [toggleShortcutModal]);

    useKeyboardShortcuts();

    return (
        <React.StrictMode>
            <PlatformProvider>
                <ShortcutsProvider onShortcut={onShortcut}>
                    {
                        shortcutModalOpen && <ShortcutsModal onClose={closeShortcutsModal}/>
                    }
                    <RouterWithProtectedRoutes
                        className={styles['router']}
                        viewsConfig={routerViewsConfig}
                        onPathNotMatch={onPathNotMatch}
                    />
                </ShortcutsProvider>
            </PlatformProvider>
        </React.StrictMode>
    );
};

module.exports = App;
