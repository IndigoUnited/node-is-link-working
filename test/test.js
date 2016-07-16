'use strict';

const EventEmitter = require('events');
const expect = require('chai').expect;
const nock = require('nock');
const mockRequire = require('mock-require');
const got = require('got');
const promiseDelay = require('promise-delay');
const isLinkWorking = require('../');
const pkg = require('../package.json');

before(() => { isLinkWorking.connectivityCacheDuration = 0; });
afterEach(() => mockRequire.stopAll());

it('should resolve to true for http://google.com (HEAD)', () => {
    return isLinkWorking('http://google.com')
    .then((working) => expect(working).to.equal(true));
});

it('should resolve to true for http://google.com (GET)', () => {
    const nocked = nock('http://google.com')
    .head('/')
    .reply(404, () => nock.cleanAll());

    return isLinkWorking('http://google.com')
    .then((working) => expect(working).to.equal(true))
    .then(() => nocked.done(), (err) => {
        nock.cleanAll();
        throw err;
    });
});

it('should resolve to false for http://thisdomainwillneverexist.org (domain not found)', () => {
    return isLinkWorking('http://thisdomainwillneverexist.org')
    .then((working) => expect(working).to.equal(false));
});

it('should resolve to false for https://github.com/somepagethatwillneverexist (404)', () => {
    return isLinkWorking('https://github.com/somepagethatwillneverexist')
    .then((working) => expect(working).to.equal(false));
});

it('should pass the correct options to `got`', () => {
    let options;

    mockRequire('got', {
        head: (url, _options) => {
            options = _options;
            return Promise.resolve();
        },
        stream: (url, _options) => {
            options = _options;
            return Promise.resolve(new EventEmitter());
        },
    });

    const isLinkWorking = mockRequire.reRequire('../');

    return Promise.resolve()
    .then(() => {
        return isLinkWorking('http://google.com')
        .then(() => {
            expect(options).to.eql({
                followRedirect: true,
                retries: 3,
                timeout: 15000,
                agent: null,
                headers: {
                    'user-agent': `is-link-working/${pkg.version} (https://github.com/IndigoUnited/is-link-working)`,
                },
            });
        });
    })
    .then(() => {
        return isLinkWorking('http://somepagethatwillneverexist.org', {
            followRedirect: false,
            retries: 1,
            timeout: 5000,
        })
        .then(() => {
            expect(options).to.eql({
                followRedirect: false,
                retries: 1,
                timeout: 5000,
                agent: null,
                headers: {
                    'user-agent': `is-link-working/${pkg.version} (https://github.com/IndigoUnited/is-link-working)`,
                },
            });
        });
    });
});

it('should report broken with urls having wrong protocols', () => {
    return isLinkWorking('htttps://google.com')
    .then((working) => expect(working).to.equal(false));
});

describe('connectivity check', () => {
    it('should NOT check connectivity if options.checkConnectivity is false', () => {
        let called = false;

        mockRequire('is-online', (callback) => {
            called = true;
            return callback(null, true);
        });

        const isLinkWorking = mockRequire.reRequire('../');

        return isLinkWorking('http://thisdomainwillneverexist.org')
        .then((working) => {
            expect(called).to.equal(false);
            expect(working).to.equal(false);
        });
    });

    it('should resolve to false if request failed but we are online', () => {
        let called = false;

        mockRequire('is-online', (callback) => {
            called = true;
            return callback(null, true);
        });

        const isLinkWorking = mockRequire.reRequire('../');

        return isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true })
        .then((working) => {
            expect(called).to.equal(true);
            expect(working).to.equal(false);
        });
    });

    it('should reject if request failed and we are NOT online', () => {
        let called = false;

        mockRequire('is-online', (callback) => {
            called = true;
            return callback(null, false);
        });

        const isLinkWorking = mockRequire.reRequire('../');

        return isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true })
        .then(() => {
            throw new Error('Should have failed');
        }, (err) => {
            expect(called).to.equal(true);
            expect(err).to.be.an.instanceOf(got.RequestError);
        });
    });

    it('should handle connectivity check errors, rejecting with the original request error', () => {
        let called = false;

        mockRequire('is-online', (callback) => {
            called = true;
            return callback(new Error('foo'));
        });

        const isLinkWorking = mockRequire.reRequire('../');

        return isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true })
        .then(() => {
            throw new Error('Should have failed');
        }, (err) => {
            expect(called).to.equal(true);
            expect(err).to.be.an.instanceOf(got.RequestError);
        });
    });
});

describe('connectivity cache', () => {
    it('should cache is-online result', () => {
        let nrCalls = 0;

        mockRequire('is-online', (callback) => {
            nrCalls += 1;
            return callback(null, true);
        });

        const isLinkWorking = mockRequire.reRequire('../');

        isLinkWorking.connectivityCacheDuration = 100;

        return Promise.resolve()
        .then(() => {
            return Promise.all([
                isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true }),
                promiseDelay(50).then(() => isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true })),
            ])
            .then((working) => {
                expect(working).to.eql([false, false]);
                expect(nrCalls).to.equal(1);
            });
        })
        .then(() => promiseDelay(75))
        .then(() => {
            return isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true })
            .then((working) => {
                expect(working).to.equal(false);
                expect(nrCalls).to.equal(2);
            });
        });
    });

    it('should not cache is-online errors', () => {
        let nrCalls = 0;

        mockRequire('is-online', (callback) => {
            nrCalls += 1;
            return callback(new Error('foo'));
        });

        const isLinkWorking = mockRequire.reRequire('../');

        return isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true })
        .then(() => {
            throw new Error('Should have failed');
        }, () => {
            mockRequire('is-online', (callback) => {
                nrCalls += 1;
                return callback(null, true);
            });

            const isLinkWorking = mockRequire.reRequire('../');

            return isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true })
            .then((working) => {
                expect(nrCalls).to.equal(2);
                expect(working).to.equal(false);
            });
        });
    });

    it('should not cache if connectivityCacheDuration is 0', () => {
        let nrCalls = 0;

        mockRequire('is-online', (callback) => {
            nrCalls += 1;
            return callback(null, true);
        });

        const isLinkWorking = mockRequire.reRequire('../');

        isLinkWorking.connectivityCacheDuration = 0;

        return Promise.resolve()
        .then(() => {
            return Promise.all([
                isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true }),
                isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true }),
                promiseDelay(50).then(() => isLinkWorking('http://thisdomainwillneverexist.org', { checkConnectivity: true })),
            ])
            .then((working) => {
                expect(working).to.eql([false, false, false]);
                expect(nrCalls).to.equal(3);
            });
        });
    });
});
