# sauce-tap-runner

[![NPM](https://nodei.co/npm/sauce-tap-runner.png?compact=true)](https://nodei.co/npm/sauce-tap-runner/)

[![Build Status](https://drone.io/github.com/conradz/sauce-tap-runner/status.png)](https://drone.io/github.com/conradz/sauce-tap-runner/latest)
[![Dependency Status](https://gemnasium.com/conradz/sauce-tap-runner.png)](https://gemnasium.com/conradz/sauce-tap-runner)

[![Selenium Test Status](https://saucelabs.com/browser-matrix/sauce-tap-runner.svg)](https://saucelabs.com/u/sauce-tap-runner.svg)

Run TAP unit tests in the browser using
[Sauce Labs](https://saucelabs.com/home) hosted browsers. This helper takes care
of setting up the tunnel to Sauce Labs servers and provides the test page and
TAP parsing. It will also set the test result status on Sauce Labs so that you
can use the awesome [status images](https://saucelabs.com/docs/status-images).
(Note that you must also set the `build` field on the desired capabilities
object for the images to work.)

## Example

```js
var Runner = require('sauce-tap-runner'),
    browserify = require('browserify'),
    async = require('async');

var tests = new Runner(sauceUser, sauceKey),
    // Browserify is not required, can use either a string or stream of JS code
    src = browserify().add('tests.js').bundle();

async.series([run('chrome'), run('firefox')], closeTests);

function run(browser) {
    // Return a function that when called will run tests in the specified
    // browser

    return function(callback) {
        tests.run(src, { browserName: browser }, function(err, results) {
            if (err) {
                return callback(err);
            }

            console.log(results);
            callback();
        });
    };
}

function closeTests(err) {
    if (err) {
        console.error(err);
    } else {
        console.log('Tests completed');
    }

    tests.close(function() {
        // Runner is closed
    });
}
```

## Reference

### `new Runner(sauceUser, sauceKey)`

Creates a new test runner. A single test runner maintains a single Sauce Connect
tunnel. Using a single runner for all your tests will improve speed as it takes
time to setup the tunnel. A tunnel will only be created when you run the tests.

`sauceUser` and `sauceKey` must be your Sauce Labs username and key.

### `#run(src, desiredCapabilities, [options], [callback])`

Runs the tests in a new browser. It will create a new WebDriver connection to
the browser and run the JS tests provided. It is not able to run tests in
parallel; you must wait till one test is completed before running the next.

`src` can be a string or stream containing the JS code for the tests. The tests
should output TAP-compatible results to the browser console using `console.log`.

`desiredCapabilities` is an object that will be passed to the Sauce Labs server
when creating the browser. See
[the docs](https://saucelabs.com/docs/additional-config) for information on what
options you can provide. The username and password is automatically set.

`options` is an optional object containing the options for the test runner. See
the [wd-tap-runner docs](https://github.com/conradz/wd-tap-runner) for valid
options.

`callback` is an optional function that will be called with the error if any
occurred and the test results. Note that failed tests are not considered errors;
they will be reported in the results. The results are the same as for
[wd-tap-runner](https://github.com/conradz/wd-tap-runner).

### `#close([callback])`

Closes the Sauce Connect tunnel. Will call `callback` when everything is closed.
All tests must be finished before closing.

### Events

`Runner` inherits from `EventEmitter`. It will emit the following events:

 * `tunnel-connect`: Starting to connect the Sauce Connect tunnel
 * `tunnel(tunnel)`: The Sauce Connect tunnel has been connected
 * `tunnel-error(err)`: An error occurred when connecting the Sauce Connect
   tunnel
 * `browser(browser)`: Successfully connected to a new browser
 * `results(results)`: A test run has finished
 * `close`: The runner has been closed
