// No-op Shell — desktop Qt transport removed.
// Leto runs as a standalone web app with no Stremio desktop dependency.

const EventEmitter = require('eventemitter3');

function Shell() {
    let active = false;
    const events = new EventEmitter();

    Object.defineProperties(this, {
        active:    { configurable: false, enumerable: true, get: () => active },
        error:     { configurable: false, enumerable: true, get: () => null },
        starting:  { configurable: false, enumerable: true, get: () => false },
        transport: { configurable: false, enumerable: true, get: () => null },
    });

    this.start = function() {
        if (active) return;
        active = true;
        events.emit('stateChanged');
    };
    this.stop = function() {
        active = false;
        events.emit('stateChanged');
    };
    this.on  = function(name, listener) { events.on(name, listener); };
    this.off = function(name, listener) { events.off(name, listener); };
}

module.exports = Shell;
