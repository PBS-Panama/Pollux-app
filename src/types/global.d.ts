interface ChromeWebView {
    addEventListener: (type: 'message', listenenr: (event: any) => void) => void,
    removeEventListener: (type: 'message', listenenr: (event: any) => void) => void,
    postMessage: (message: string) => void,
}

interface Chrome {
    webview: ChromeWebView,
}

declare global {
    var chrome: Chrome | undefined;
}

export { };
