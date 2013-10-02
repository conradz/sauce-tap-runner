var async = require('async'),
    Runner = require('./');

var testSrc = [
    '(function() {',
        'console.log("TAP version 13");',
        'console.log("# beep");',
        'console.log("ok 1 should be equal");',
        'console.log("ok 2 should be equal");',
        'console.log("");',
        'console.log("1..2");',
        'console.log("# tests 2");',
        'console.log("# pass 2");',
        'console.log("");',
        'console.log("# ok");',
    '})();'
].join('\r\n');

var user = process.env.SAUCE_USER,
    key = process.env.SAUCE_KEY,
    build = process.env.DRONE_BUILD_NUMBER;
if (!user || !key) {
    console.log('Set SAUCE_USER and SAUCE_KEY to your SauceLabs credentials');
    process.exit(1);
}

var runner = new Runner(user, key);
runner.on('tunnel-connect', function() {
    console.log('Connecting tunnel');
});

runner.on('tunnel', function() {
    console.log('Tunnel connected');
});

runner.on('browser', function() {
    console.log('Connected to browser');
});

runner.on('close', function() {
    console.log('Runner closed');
});

run();

function run() {
    async.series([
        test('firefox'),
        test('chrome')
    ], complete);
}

function test(browser) {
    return function(callback) {
        console.log('Testing', browser);

        var capabilities = {
            browserName: browser,
            name: 'Test ' + browser,
            build: build
        };
        runner.run(testSrc, capabilities,
            function(err, results) {
                if (err) {
                    return callback(err);
                } else if (!results.ok) {
                    return callback(new Error('Tests failed'));
                } else {
                    callback();
                }
            });
    };
}

function complete(err) {
    runner.close(function() {
        if (err) {
            console.error('Error occurred');
            console.error(err);
            process.exit(1);
        } else {
            console.log('Tests passed!');
        }
    });
}
