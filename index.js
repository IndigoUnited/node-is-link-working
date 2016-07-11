'use strict';

const WritableStream = require('stream').Writable;
const got = require('got');
const isOnline = require('is-online');
const pkg = require('./package.json');

let isOnlineCache;

function isOnlineAsPromise() {
    // Cache the isOnline() result up to `exports.connectivityCacheDuration` ms
    if (isOnlineCache && isOnlineCache.cachedAt > Date.now() - module.exports.connectivityCacheDuration) {
        return isOnlineCache;
    }

    isOnlineCache = new Promise((resolve, reject) => {
        isOnline((err, online) => {
            if (err) {
                delete isOnlineCache.promise;  // Do not cache errors
                /* istanbul ignore next */
                reject(err);
            } else {
                resolve(online);
            }
        });
    });

    isOnlineCache.cachedAt = Date.now();

    return isOnlineCache;
}

function checkConnectivity(requestErr) {
    return isOnlineAsPromise()
    .catch(() => { throw requestErr; })
    .then((online) => {
        if (!online) {
            throw requestErr;
        }

        return false;
    });
}

class DevNull extends WritableStream {
    _write(chunk, encoding, callback) {
        callback();
    }
}

function tryHead(link, gotOptions) {
    return got.head(link, gotOptions)
    .then(() => true);
}

function tryGet(link, options, gotOptions) {
    return new Promise((resolve, reject) => {
        let stream;
        let req;

        try {
            stream = got.stream(link, gotOptions);
        } catch (err) {
            return resolve(false);
        }

        stream
        .on('request', (req_) => { req = req_; })
        .on('response', (res) => {
            res.on('error', () => {});  // Swallow any response errors, because we are going to abort the request
            setImmediate(() => req.abort());
            resolve(true);
        })
        .on('error', (err, body, res) => {
            res && res.on('error', () => {});  // Swallow any response errors, because we are going to abort the request
            setImmediate(() => req.abort());

            if (err instanceof got.MaxRedirectsError || err instanceof got.HTTPError) {
                return resolve(false);
            }

            /* istanbul ignore else */
            if (err instanceof got.RequestError) {
                return resolve(options.checkConnectivity ? checkConnectivity(err) : false);
            }

            /* istanbul ignore next */
            reject(err);
        })
        .pipe(new DevNull());
    });
}

// -------------------------------------------------------------------------

function isLinkWorking(link, options) {
    options = Object.assign({
        checkConnectivity: false,
        followRedirect: true,
        timeout: 15000,
        retries: 3,
        agent: null,
    }, options);

    const gotOptions = {
        timeout: options.timeout,
        followRedirect: options.followRedirect,
        retries: options.retries,
        agent: options.agent,
        headers: {
            'user-agent': `is-link-working/${pkg.version} (https://github.com/IndigoUnited/is-link-working)`,
        },
    };

    return tryHead(link, gotOptions)
    .catch(() => tryGet(link, options, gotOptions));
}

module.exports = isLinkWorking;
module.exports.connectivityCacheDuration = 5000;
