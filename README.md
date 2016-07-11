# is-link-working

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

[npm-url]:https://npmjs.org/package/is-link-working
[downloads-image]:http://img.shields.io/npm/dm/is-link-working.svg
[npm-image]:http://img.shields.io/npm/v/is-link-working.svg
[travis-url]:https://travis-ci.org/IndigoUnited/node-is-link-working
[travis-image]:http://img.shields.io/travis/IndigoUnited/node-is-link-working/master.svg
[coveralls-url]:https://coveralls.io/r/IndigoUnited/node-is-link-working
[coveralls-image]:https://img.shields.io/coveralls/IndigoUnited/node-is-link-working/master.svg
[david-dm-url]:https://david-dm.org/IndigoUnited/node-is-link-working
[david-dm-image]:https://img.shields.io/david/IndigoUnited/node-is-link-working.svg
[david-dm-dev-url]:https://david-dm.org/IndigoUnited/node-is-link-working#info=devDependencies
[david-dm-dev-image]:https://img.shields.io/david/dev/IndigoUnited/node-is-link-working.svg

Checks if a given hypermedia link is working or broken (2xx).

Tries a HEAD request first because it's faster. If that fails, tries a GET request and aborts it as soon as we got the response headers.
If the URL is unreachable, optionally checks if you are offline to avoid returning false negatives.


## Installation

`$ npm install is-link-working`


## Usage

`isLinkWorking(url, options) -> Promise`

```js
const isLinkWorking = require('is-link-working');

isLinkWorking('http://google.com')
.then((working) => console.log('working', working))
.catch((err) => console.log('err while checking', err));
```

Available options:

- `checkConnectivity` - True to check internet connectivity if the request fails because of a network error (defaults to `false`)
- `followRedirect` - Defines if redirect responses should be followed automatically (defaults to `true`)
- `timeout` - Milliseconds to wait for a server to send response headers before aborting request with `ETIMEDOUT` error (defaults to `10000`)
- `retries` - Number of request retries when network errors happens, see [got retries](https://github.com/sindresorhus/got) option for more information (defaults to `3`)
- `agent` -  The agent to use, see https://nodejs.org/api/http.html#http_http_request_options_callback (defaults to `null`)


Connectivity status (online/offline) is made with [is-online](https://github.com/sindresorhus/is-online) and its result is cached for 5000 ms to avoid calling it too many times. You may tweak that if you want:

```js
isLinkWorking.connectivityCacheDuration = 0;  // No cache
```


## Tests

`$ npm test`   
`$ npm test-cov` to get coverage report


## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).
