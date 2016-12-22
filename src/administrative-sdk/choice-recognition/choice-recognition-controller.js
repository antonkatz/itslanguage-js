import Base64Utils from '../utils/base64-utils';
import ChoiceRecognition from './choice-recognition';
import Connection from '../connection/connection-controller';
import when from 'when';
/**
 * Controller class for the ChoiceRecognition model.
 * @private
 */
export default class ChoiceRecognitionController {
  /**
   * @param {Connection} connection - Object to use for making a connection to the REST API and Websocket server.
   */
  constructor(connection) {
    /**
     * Object to use for making a connection to the REST API and Websocket server.
     * @type {Connection}
     */
    this._connection = connection;
  }

  /**
   * Initialise the choice recognition challenge through RPCs.
   *
   * @param {ChoiceChallenge} challenge - ChoiceChallenge.
   * @private
   */
  choiceRecognitionInitChallenge(challenge) {
    return this._connection._session.call('nl.itslanguage.choice.init_challenge',
      [this._connection._recognitionId, challenge.id])
      .then(
        // RPC success callback
        recognitionId => {
          console.log('Challenge initialised for recognitionId: ' + this._connection._recognitionId);
          return recognitionId;
        });
  }

  /**
   * Initialise the pronunciation analysis audio specs through RPCs.
   *
   * @param {AudioRecorder} recorder - AudioRecorder.
   * @param {Function} dataavailableCb - Callback.
   * @private
   */
  choiceRecognitionInitAudio(recorder, dataavailableCb) {
    // Indicate to the socket server that we're about to start recording a
    // challenge. This allows the socket server some time to fetch the metadata
    // and reference audio to start the analysis when audio is actually submitted.
    const specs = recorder.getAudioSpecs();
    return this._connection._session.call('nl.itslanguage.choice.init_audio',
      [this._connection._recognitionId, specs.audioFormat], specs.audioParameters).then(
      // RPC success callback
      recognitionId => {
        console.log('Accepted audio parameters for recognitionId after init_audio: ' + this._connection._recognitionId);
        // Start listening for streaming data.
        recorder.addEventListener('dataavailable', dataavailableCb);
        return recognitionId;
      });
  }

  /**
   * Start a choice recognition from streaming audio.
   *
   * @param {ChoiceChallenge} challenge - The choice challenge to perform.
   * @param {AudioRecorder} recorder - The audio recorder to extract audio from.
   * @param {boolean} [trim=true] - Whether to trim the start and end of recorded audio.
   * @returns {Promise.<ChoiceRecognition>} A {@link https://github.com/cujojs/when} Promise containing a {@link ChoiceRecognition}.
   * @emits {string} 'ReadyToReceive' when the call is made to receive audio. The recorder can now send audio.
   * @throws {Promise.<Error>} {@link ChoiceChallenge} parameter is required or invalid.
   * @throws {Promise.<Error>} {@link ChoiceChallenge#id} field is required.
   * @throws {Promise.<Error>} If the connection is not open.
   * @throws {Promise.<Error>} If the recorder is already recording.
   * @throws {Promise.<Error>} If a recognition session is already in progress.
   * @throws {Promise.<Error>} If something went wrong during analysis.
   */
  startStreamingChoiceRecognition(challenge, recorder, trim) {
    if (typeof challenge !== 'object' || !challenge) {
      return Promise.reject(new Error(
        '"challenge" parameter is required or invalid'));
    }
    if (!challenge.id) {
      return Promise.reject(new Error('challenge.id field is required'));
    }

    // Validate environment prerequisites.
    if (!this._connection._session) {
      return Promise.reject(new Error('WebSocket connection was not open.'));
    }

    if (recorder.isRecording()) {
      return Promise.reject(new Error('Recorder should not yet be recording.'));
    }

    if (this._connection._recognitionId !== null) {
      return Promise.reject(new Error('Session with recognitionId ' + this._connection._recognitionId +
        ' still in progress.'));
    }

    const self = this;
    let trimAudioStart = 0.15;
    const trimAudioEnd = 0.0;
    if (trim === false) {
      trimAudioStart = 0.0;
    }
    return new when.Promise((resolve, reject, notify) => {
      function _cb(data) {
        const recognition = new ChoiceRecognition(
          challenge.id, data.userId, data.id,
          new Date(data.created), new Date(data.updated),
          self._connection.addAccessToken(data.audioUrl), data.recognised);
        resolve({recognitionId: self._connection._recognitionId, recognition});
      }

      function _ecb(data) {
        // There was an unexpected error.
        const recognition = new ChoiceRecognition(
          challenge.id, data.userId, data.id,
          new Date(data.created), new Date(data.updated),
          self._connection.addAccessToken(data.audioUrl), null);
        reject(
          {
            recognition,
            message: data.message
          }
        );
      }

      self._connection._recognitionId = null;

      // Start streaming the binary audio when the user instructs
      // the audio recorder to start recording.
      function dataavailableCb(chunk) {
        const encoded = Base64Utils._arrayBufferToBase64(chunk);
        console.log('Sending audio chunk to websocket for recognitionId: ' +
          self._connection._recognitionId);
        self._connection._session.call('nl.itslanguage.choice.write',
          [self._connection._recognitionId, encoded, 'base64']).then(
          // RPC success callback
          res => {
            console.debug('Delivered audio successfully');
            return res;
          },
          // RPC error callback
          res => {
            console.error('RPC error returned:', res.error);
            _ecb(res);
          }
        );
      }

      function recognitionInitCb(recognitionId) {
        self._connection._recognitionId = recognitionId;
        console.log('Got recognitionId after initialisation: ' + self._connection._recognitionId);
      }
      self._connection._session.call('nl.itslanguage.choice.init_recognition', [],
        {
          trimStart: trimAudioStart,
          trimEnd: trimAudioEnd
        })
        .then(recognitionInitCb)
        .then(() =>
          self.choiceRecognitionInitChallenge(challenge)
            .then(() => {
              const p = new Promise(resolve_ => {
                if (recorder.hasUserMediaApproval()) {
                  resolve_();
                } else {
                  recorder.addEventListener('ready', resolve_);
                }
              });
              p.then(() => {
                self.choiceRecognitionInitAudio(recorder, dataavailableCb)
                  .catch(reject);
              });
            })
            .then(() => notify('ReadyToReceive'))
        )
            .catch(reject);

      // Stop listening when the audio recorder stopped.
      function recordedCb() {
        // When done, submit any plain text (non-JSON) to start analysing.
        self._connection._session.call('nl.itslanguage.choice.recognise',
          [self._connection._recognitionId]).then(
          // RPC success callback
          res => {
            // Wait for analysis results to come back.
            _cb(res);
          },
          // RPC error callback
          res => {
            console.error('RPC error returned:', res.error);
            if (res.error === 'nl.itslanguage.recognition_failed') {
              res.kwargs.recognition.message = 'Recognition failed';
            } else {
              res.kwargs.recognition.message = 'Unhandled error';
            }
            _ecb(res.kwargs.analysis);
          });

        recorder.removeEventListener('recorded', recordedCb);
        recorder.removeEventListener('dataavailable', dataavailableCb);
      }
      recorder.addEventListener('recorded', recordedCb);
    })
      .then(res => {
        self._connection._recognitionId = null;
        return Promise.resolve(res);
      })
      .catch(error => {
        self._connection._recognitionId = null;
        Connection.logRPCError(error);
        return Promise.reject(error);
      });
  }

  /**
   * Get a choice recognition in a choice challenge from the current active {@link Organisation} derived from
   * the OAuth2 scope.
   *
   * @param {string} challengeId - Specify a choice challenge identifier.
   * @param {string} recognitionId - Specify a choice recognition identifier.
   * @returns {Promise.<ChoiceRecognition>} Promise containing a ChoiceRecognition.
   * @throws {Promise.<Error>} {@link ChoiceChallenge#id} field is required.
   * @throws {Promise.<Error>} {@link ChoiceRecognition#id} field is required.
   * @throws {Promise.<Error>} If no result could not be found.
   */
  getChoiceRecognition(challengeId, recognitionId) {
    if (!challengeId) {
      return Promise.reject(new Error('challengeId field is required'));
    }
    if (!recognitionId) {
      return Promise.reject(new Error('recognitionId field is required'));
    }
    const url = this._connection._settings.apiUrl + '/challenges/choice/' +
      challengeId + '/recognitions/' + recognitionId;

    return this._connection._secureAjaxGet(url)
      .then(datum => new ChoiceRecognition(challengeId, datum.userId,
          datum.id, new Date(datum.created), new Date(datum.updated),
          datum.audioUrl, datum.recognised));
  }

  /**
   * List all choice recognitions in a specific {@link ChoiceChallenge} from the current active {@link Organisation}
   * derived from the OAuth2 scope.
   *
   * @param {string} challengeId - Specify a choice challenge to list speech recognitions for.
   * @returns {Promise.<ChoiceRecognition[]>} Promise containing an array of ChoiceRecognitions.
   * @throws {Promise.<Error>} {@link ChoiceChallenge#id} is required.
   * @throws {Promise.<Error>} If no result could not be found.
   */
  listChoiceRecognitions(challengeId) {
    if (!challengeId) {
      return Promise.reject(new Error('challengeId field is required'));
    }
    const url = this._connection._settings.apiUrl + '/challenges/choice/' +
      challengeId + '/recognitions';
    return this._connection._secureAjaxGet(url)
      .then(data => {
        const recognitions = [];
        data.forEach(datum => {
          const recognition = new ChoiceRecognition(challengeId, datum.userId,
            datum.id, new Date(datum.created), new Date(datum.updated),
            datum.audioUrl, datum.recognised);
          recognitions.push(recognition);
        });
        return recognitions;
      });
  }
}
