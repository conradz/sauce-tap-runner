var wdRunner = require('wd-tap-runner'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    wd = require('wd'),
    sauceConnect = require('sauce-connect-launcher'),
    sauceResults = require('sauce-results');;

var SAUCE_URL = 'ondemand.saucelabs.com',
    SAUCE_PORT = 80;

function Runner(user, key) {
    EventEmitter.call(this);

    this.user = user;
    this.key = key;
    this._running = false;
    this._tunnel = null;

    this._tunnelId = ('tap-test-'
        + Date.now() + '-'
        + Math.floor(Math.random() * 100));
}

util.inherits(Runner, EventEmitter);

Runner.prototype._getTunnel = function(callback) {
    if (this._tunnel) {
        return callback(null, this._tunnel);
    }

    var self = this,
        options = {
            username: this.user,
            accessKey: this.key,
            tunnelIdentifier: this._tunnelId
        };

    this.emit('tunnel-connect');
    sauceConnect(options, function(err, tunnel) {
        if (err) {
            self.emit('tunnel-error', err);
            return callback(err);
        }

        self._tunnel = tunnel;
        self.emit('tunnel', tunnel);
        setTimeout(function() {
            callback(null, tunnel);
        }, 5000);
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

    var self = this,
        results;
    this._running = true;

    this._getTunnel(function(err, tunnel) {
        if (err) {
            return done(err);
        }

        createBrowser(tunnel);
    });

    function createBrowser(tunnel) {
        var options = {};
        for (var k in capabilities) {
            options[k] = capabilities[k];
        }
        options['tunnel-identifier'] = self._tunnelId;

        var browser = wd.remote(
            SAUCE_URL, SAUCE_PORT,
            self.user, self.key);

        browser.init(options, function(err) {
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
                ran(err, results);
            });
        });
    }

    function ran(err, r) {
        if (err) {
            self._running = false;
            return callback(err);
        }

        results = r;

        sauceResults({
            user: self.user,
            key: self.key,
            passed: results.ok
        }, done);
    }

    function done(err) {
        if (err) {
            return callback(err);
        }

        self._running = false;
        callback(null, results);
    }
};

Runner.prototype.close = function(callback) {
    var self = this;

    if (this._running) {
        done(new Error('Tests are still running'));
    }

    if (this._tunnel) {
        this._tunnel.close(function() {
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
