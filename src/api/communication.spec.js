/**
 * This file contains the unittests for all exported functions in the
 * acompanying `communication.js` file.
 */

import * as communication from './communication';

const TEST_API_URL = 'https://www.example.com';


describe('updateSettings', () => {
  it('should allow to pass any object', () => {
    const newSettings = {
      fi: 'fi',
      fa: 'fa',
      fo: 'fo'
    };

    expect(() => communication.updateSettings(newSettings)).not.toThrowError();
  });

  it('should throw an error when something other than a object is given', () => {
    const faultyNewSettings = 'this is not the kind of object you are looking for';

    expect(() => communication.updateSettings(faultyNewSettings))
      .toThrowError(Error, 'Please, only provide objects as settings.');
  });
});


describe('request', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = spyOn(global, 'fetch');
    communication.updateSettings({apiURL: TEST_API_URL});
  });

  it('should make the request for the given params and handle its response', done => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const responseBody = {location: 'South East Asia'};
    const response = new Response(JSON.stringify(responseBody), {headers});
    fetchSpy.and.returnValue(Promise.resolve(response));

    const requestBody = {packed: 'suitcase'};

    communication.request('POST', '/lets/go/somewhere', requestBody)
      .then(result => {
        const request = fetchSpy.calls.mostRecent();
        expect(request.args).toEqual([
          `${TEST_API_URL}/lets/go/somewhere`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
          }
        ]);

        expect(result).toEqual(responseBody);
        done();
      }, fail);
  });

  it('should keep a URLSearchParams body as URLSearchParams', done => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const responseBody = {location: 'South East Asia'};
    const response = new Response(JSON.stringify(responseBody), {headers});
    fetchSpy.and.returnValue(Promise.resolve(response));

    const requestBody = new URLSearchParams();
    requestBody.set('packed', 'suitcase');

    communication.request('POST', '/lets/go/somewhere', requestBody)
      .then(result => {
        const request = fetchSpy.calls.mostRecent();
        expect(request.args).toEqual([
          `${TEST_API_URL}/lets/go/somewhere`,
          {
            method: 'POST',
            headers,
            body: requestBody
          }
        ]);

        expect(result).toEqual(responseBody);
        done();
      }, fail);
  });

  it('should keep a FormData body as FormData', done => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const responseBody = {location: 'South East Asia'};
    const response = new Response(JSON.stringify(responseBody), {headers});
    fetchSpy.and.returnValue(Promise.resolve(response));

    const requestBody = new FormData();
    requestBody.set('memory', new Blob(), 'a nice pictrue taken on the journey');

    communication.request('POST', '/lets/go/somewhere', requestBody)
      .then(result => {
        const request = fetchSpy.calls.mostRecent();
        expect(request.args).toEqual([
          `${TEST_API_URL}/lets/go/somewhere`,
          {
            method: 'POST',
            headers,
            body: requestBody
          }
        ]);

        expect(result).toEqual(responseBody);
        done();
      }, fail);
  });

  it('should reject with the custom JSON errors from the API', done => {
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    const responseBody = {
      unexpected_error: 'The Spanish Inquisition' // eslint-disable-line camelcase
    };

    const response = new Response(JSON.stringify(responseBody), {
      status: 500,
      headers: responseHeaders
    });
    fetchSpy.and.returnValue(Promise.resolve(response));

    communication.request('GET', '/give/me/coffee')
      .then(fail, result => {
        expect(result).toEqual(responseBody);
        done();
      });
  });

  it('should reject with the plain HTTP error status if the response does have a JSON body', done => {
    const response = new Response('I am a teapot', {
      status: 418,
      statusText: 'I am a teapot'
    });
    fetchSpy.and.returnValue(Promise.resolve(response));

    communication.request('GET', '/give/me/coffee')
      .then(fail, message => {
        expect(message).toEqual(`${response.status}: ${response.statusText}`);
        done();
      });
  });

  it('should return the response if it is an OK response, but doesn\'t have a JSON body', done => {
    const response = new Response('I wish I was a teapot');
    fetchSpy.and.returnValue(Promise.resolve(response));

    communication.request('GET', '/give/me/coffee')
      .then(result => {
        expect(result).toBe(response);
        done();
      }, fail);
  });
});


describe('authorisedRequest', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = spyOn(window, 'fetch');
    communication.updateSettings({
      apiURL: TEST_API_URL,
      authorizationToken: 'token'
    });
  });

  // XXX Currently it is only a warning that is logged. Most of the SDK is
  // still building a complete URL which blocks this feature. Once all those
  // comlete URLs are changed to relative URLs, this comment should be
  // removed and this test should be executed.
  xit('should only allow relative urls', done => {
    communication.authorisedRequest('PUT', 'https://domain.ext/path', {foo: 'bar'})
      .then(fail, message => {
        expect(message).toEqual('Only relative ITSLanguage API URLs are allowed.');
        done();
      });
  });

  // XXX This test should be removed if when te 'should only allow relative
  // URLs' test is included in the test run.
  it('warns the develors that a change needs to be made to the SDK for every full URL', done => {
    const warnSpy = spyOn(console, 'warn');
    fetchSpy.and.returnValue(Promise.resolve(new Response()));

    const expectedRequestHeaders = new Headers();
    expectedRequestHeaders.set('Authorization', 'Bearer token');

    communication.authorisedRequest('GET', 'https://domain.ext/path')
      .then(() => {
        expect(warnSpy).toHaveBeenCalledWith('Complete URLs will soon be disallowed in authorised requests.');
        done();
      }, fail);
  });

  it('should reject when there is no authorizationToken set in the settings', done => {
    communication.updateSettings({authorizationToken: null});
    communication.authorisedRequest('PUT', '/path', {foo: 'bar'})
      .then(fail, message => {
        expect(message).toEqual('Please authenticate first.');
        done();
      });
  });

  it('should set the Authorization header with the authorizationToken as a bearer token', done => {
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');

    const responseBody = {location: 'South East Asia'};
    const response = new Response(JSON.stringify(responseBody), {
      headers: responseHeaders
    });
    fetchSpy.and.returnValue(Promise.resolve(response));

    const expectedRequestHeaders = new Headers();
    expectedRequestHeaders.set('Authorization', 'Bearer token');

    communication.authorisedRequest('GET', '/foo')
      .then(result => {
        const request = fetchSpy.calls.mostRecent();
        expect(request.args).toEqual([
          `${TEST_API_URL}/foo`,
          {
            method: 'GET',
            headers: expectedRequestHeaders,
            body: undefined
          }
        ]);

        expect(result).toEqual(responseBody);
        done();
      }, fail);
  });
});
