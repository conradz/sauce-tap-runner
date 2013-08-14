var wdRunner = require('wd-tap-runner'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    wd = require('wd'),
    SauceTunnel = require('sauce-tunnel');

var SAUCE_URL = 'ondemand.saucelabs.com',
    SAUCE_PORT = 80;

function Runner(user, key) {
    EventEmitter.call(this);

    this.user = user;
    this.key = key;
    this._running = false;
    this._tunnel = null;
}

util.inherits(Runner, EventEmitter);

Runner.prototype._getTunnel = function(callback) {
    if (this._tunnel) {
        callback(null, this._tunnel);
        return;
    }

    var id = 'tap-test-' + Math.floor(_.random(0, 1000000)),
        tunnel = new SauceTunnel(this.user, this.key, id, true, 120),
        self = this;

    this.emit('tunnel-connect', tunnel);
    tunnel.start(function(connected) {
        if (!connected) {
            self.emit('tunnel-error');
            callback(new Error('Could not connect tunnel'));
            return;
        }

        self._tunnel = tunnel;
        self.emit('tunnel', tunnel);
        callback(null, tunnel);
    });
};

Runner.prototype.run = function(src, capabilities, options, callback) {
    if (this._running) {
        callback(new Error('Another test is currently running'));
        return;
    }

    options = options || {};
    callback = callback || (function() {});
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    var self = this;
    this._running = true;

    this._getTunnel(function(err, tunnel) {
        if (err) {
            return done(err);
        }

        createBrowser(tunnel);
    });

    function createBrowser(tunnel) {
        capabilities = _.assign({}, capabilities);
        capabilities['tunnel-identifier'] = tunnel.identifier;

        var browser = wd.remote(
            SAUCE_URL, SAUCE_PORT,
            self.user, self.key);

        browser.init(capabilities, function(err) {
            if (err) {
                return done(err);
            }

            self.emit('browser', browser);
            runTests(browser);
        });
    }

    function runTests(browser) {
        wdRunner(src, browser, options, function(err, results) {
            if (!err) {
                self.emit('results', results);
            }

            browser.quit(function() {
                // Ignore error when closing browser
                done(err, results);
            });
        });
    }

    function done(err, result) {
        self._running = false;
        if (callback) {
            callback(err, result);
        }
    }
};

Runner.prototype.close = function(callback) {
    var self = this;

    if (this._running) {
        done(new Error('Tests are still running'));
    }

    if (this._tunnel) {
        this._tunnel.stop(function() {
            done();
        });
    } else {
        done();
    }

    function done(err) {
        if (!err) {
            self.emit('close');
        }

        if (callback) {
            callback(err);
        }
    }
}

module.exports = Runner;