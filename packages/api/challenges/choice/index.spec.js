/**
 * The unit tests for the exported functions from `index.js`.
 */

import * as choice from './index';
import * as communication from '../../communication';

describe('Choice Challenge API', () => {
  describe('create', () => {
    it('should make an authorised request', done => {
      const authorisedRequestSpy = spyOn(communication, 'authorisedRequest');
      authorisedRequestSpy.and.returnValue(Promise.resolve({ id: 'c4t' }));

      choice
        .create({ question: 'poes?' })
        .then(() => {
          const createRequest = authorisedRequestSpy.calls.mostRecent();

          expect(createRequest.args).toEqual([
            'POST',
            '/challenges/choice',
            { question: 'poes?' },
          ]);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('getById', () => {
    it('should make an authorised request', done => {
      const authorisedRequestSpy = spyOn(communication, 'authorisedRequest');
      authorisedRequestSpy.and.returnValue(Promise.resolve({ id: 'c4t' }));

      choice
        .getById('c4t')
        .then(() => {
          const getRequest = authorisedRequestSpy.calls.mostRecent();

          expect(getRequest.args).toEqual(['GET', '/challenges/choice/c4t']);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('getAll', () => {
    it('should make an authorised request', done => {
      const authorisedRequestSpy = spyOn(communication, 'authorisedRequest');
      authorisedRequestSpy.and.returnValue(Promise.resolve([{ id: 'c4t' }]));

      choice
        .getAll()
        .then(() => {
          const getRequest = authorisedRequestSpy.calls.mostRecent();

          expect(getRequest.args).toEqual(['GET', '/challenges/choice']);
          done();
        })
        .catch(done.fail);
    });

    it('should allow filters if they are a URLSearchParams object', done => {
      const authorisedRequestSpy = spyOn(communication, 'authorisedRequest');
      authorisedRequestSpy.and.returnValue(Promise.resolve([{ id: 'c4t' }]));

      const filters = new URLSearchParams();
      filters.set('theme', 'm30w');

      choice
        .getAll(filters)
        .then(() => {
          const getRequest = authorisedRequestSpy.calls.mostRecent();

          expect(getRequest.args).toEqual([
            'GET',
            '/challenges/choice?theme=m30w',
          ]);
          done();
        })
        .catch(done.fail);
    });

    it('should reject when something other than URLSearchParams is given as the filters', done => {
      choice
        .getAll('this is not an instance of URLSearchParams')
        .then(done.fail)
        .catch(() => {
          done();
        });
    });
  });
});
