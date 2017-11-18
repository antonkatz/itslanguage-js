/**
 * The unittests for the exported functions from `index.js`.
 */

import * as communication from '../../communication';
import * as pronunciation from './index';


describe('createPronunciationChallenge', () => {
  it('should make an authorised request', done => {
    const authorisedRequestSpy = spyOn(communication, 'authorisedRequest');
    authorisedRequestSpy.and.returnValue(Promise.resolve({id: 'c4t'}));

    pronunciation.createPronunciationChallenge({question: 'poes?'})
      .then(() => {
        const createRequest = authorisedRequestSpy.calls.mostRecent();
        expect(createRequest.args).toEqual(['POST', '/challenges/pronunciation', {question: 'poes?'}]);
        done();
      }, fail);
  });
});


describe('getPronunciationChallengeByID', () => {
  it('should make an authorised request', done => {
    const authorisedRequestSpy = spyOn(communication, 'authorisedRequest');
    authorisedRequestSpy.and.returnValue(Promise.resolve({id: 'c4t'}));

    pronunciation.getPronunciationChallengeByID('c4t')
      .then(() => {
        const getRequest = authorisedRequestSpy.calls.mostRecent();
        expect(getRequest.args).toEqual(['GET', '/challenges/pronunciation/c4t']);
        done();
      }, fail);
  });
});


describe('getAllPronunciationChallenges', () => {
  it('should make an authorised request', done => {
    const authorisedRequestSpy = spyOn(communication, 'authorisedRequest');
    authorisedRequestSpy.and.returnValue(Promise.resolve([{id: 'c4t'}]));

    pronunciation.getAllPronunciationChallenges()
      .then(() => {
        const getRequest = authorisedRequestSpy.calls.mostRecent();
        expect(getRequest.args).toEqual(['GET', '/challenges/pronunciation']);
        done();
      }, fail);
  });

  it('should allow filters if they are a URLSearchParams object', done => {
    const authorisedRequestSpy = spyOn(communication, 'authorisedRequest');
    authorisedRequestSpy.and.returnValue(Promise.resolve([{id: 'c4t'}]));

    const filters = new URLSearchParams();
    filters.set('theme', 'm30w');

    pronunciation.getAllPronunciationChallenges(filters)
      .then(() => {
        const getRequest = authorisedRequestSpy.calls.mostRecent();
        expect(getRequest.args).toEqual(['GET', '/challenges/pronunciation?theme=m30w']);
        done();
      }, fail);
  });

  it('should reject when something other than URLSearchParams is given as the filters', done => {
    pronunciation.getAllPronunciationChallenges('this is not an instance of URLSearchParams')
      .then(fail, done);
  });
});


describe('deletePronunciationChallenge', () => {
  it('should make an authorised request', done => {
    const authorisedRequestSpy = spyOn(communication, 'authorisedRequest');
    authorisedRequestSpy.and.returnValue(Promise.resolve({id: 'c4t'}));

    pronunciation.deletePronunciationChallenge('c4t')
      .then(() => {
        const getRequest = authorisedRequestSpy.calls.mostRecent();
        expect(getRequest.args).toEqual(['DELETE', '/challenges/pronunciation/c4t']);
        done();
      }, fail);
  });
});