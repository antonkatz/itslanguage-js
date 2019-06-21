import MediaRecorder from 'audio-recorder-polyfill';
import * as mediaRecorder from './index';

const CUSTOM_NS = 'CustomRecorder';
const STREAM = null;
let MyOriginalMediaRecorder = null;

const init = () => {
  // Make a copy of the original MediaRecorder;
  MyOriginalMediaRecorder = window.MediaRecorder;
};

const setup = () => {
  // Make sure there is no MediaRecorder, we don't need the default.
  delete window.MediaRecorder;
};

const restore = () => {
  // Make sure to restore the old MediaRecorder here!
  window.MediaRecorder = MyOriginalMediaRecorder;
};

const teardown = () => {
  // Delete stuff, well make sure they don't exist anymore.
  delete window[CUSTOM_NS];
  delete window.OriginalMediaRecorder;
  delete window[`Original${CUSTOM_NS}`];
};

describe('MediaRecorder', () => {
  beforeAll(init);

  beforeEach(setup);

  afterEach(teardown);

  afterAll(restore);

  describe('addAsGlobal', () => {
    it('should set MediaRecorder to window', () => {
      window.MediaRecorder = null;

      expect(window.MediaRecorder).toBeNull();

      mediaRecorder.addAsGlobal();

      expect(window.MediaRecorder).not.toBeNull();
    });

    it('should set MediaRecorder as CustomRecorder to window', () => {
      expect(window[CUSTOM_NS]).toBeUndefined();
      mediaRecorder.addAsGlobal(CUSTOM_NS);

      expect(window[CUSTOM_NS]).toEqual(MediaRecorder);
    });

    it('should store existing CustomRecorder to OriginalCustomRecorder', () => {
      window[CUSTOM_NS] = 1;
      mediaRecorder.addAsGlobal(CUSTOM_NS);

      expect(window[`Original${CUSTOM_NS}`]).toBe(1);
    });
  });

  describe('createRecorder', () => {
    const setWindow = true;
    const dontSetWindow = false;

    it('should return a recorder based on MediaRecorder', () => {
      const recorder = mediaRecorder.createRecorder(STREAM);

      expect(recorder instanceof MediaRecorder).toBeTruthy();
    });

    it('should return a recorder based on MediaRecorder without passing a stream', () => {
      const recorder = mediaRecorder.createRecorder();

      expect(recorder instanceof MediaRecorder).toBeTruthy();
    });

    it('should leave window.MediaRecorder untouched', () => {
      mediaRecorder.createRecorder(STREAM);

      expect(window.MediaRecorder).toBeUndefined();
    });

    it('should set window.MediaRecorder as instance of MediaRecorder', () => {
      mediaRecorder.createRecorder(STREAM, [], setWindow);

      expect(window.MediaRecorder).toEqual(MediaRecorder);
    });

    it('should set the MediaRecorder to CustomMediaRecorder if we ask for it', () => {
      mediaRecorder.createRecorder(STREAM, [], setWindow, CUSTOM_NS);

      expect(window[CUSTOM_NS]).toEqual(MediaRecorder);
    });

    it("should not set the MediaRecorder to CustomMediaRecorder if we ask for it but don't want to set window", () => {
      mediaRecorder.createRecorder(STREAM, [], dontSetWindow, CUSTOM_NS);

      expect(window[CUSTOM_NS]).toBeUndefined();
    });

    it('should have a function getAudioSpecs', () => {
      const recorder = mediaRecorder.createRecorder(STREAM);

      expect(recorder.getAudioSpecs).toBeDefined();
    });

    it('should create a recorder with a plugin', async () => {
      const stream = await mediaRecorder.createMediaStream();
      const amplitudePlugin = mediaRecorder.createAmplitudePlugin();
      const recorder = mediaRecorder.createRecorder(stream, [amplitudePlugin]);

      expect(recorder.plugins[0]).toEqual(amplitudePlugin);
    });
  });

  describe('getAudioSpecs', () => {
    it('should return an object with audio specs', () => {
      const recorder = mediaRecorder.createRecorder(STREAM);
      const audioSpecs = recorder.getAudioSpecs();

      const specsMock = {
        audioFormat: mediaRecorder.DEFAULT_AUDIO_FORMAT,
        audioParameters: {
          channels: mediaRecorder.DEFAULT_CHANNELS,
          sampleWidth: mediaRecorder.DEFAULT_SAMPLE_WIDTH,
          frameRate: mediaRecorder.DEFAULT_SAMPLE_RATE,
          sampleRate: mediaRecorder.DEFAULT_SAMPLE_RATE,
        },
      };

      expect(audioSpecs).toEqual(specsMock);
    });
  });

  describe('createMediaStream', () => {
    it('should returnn a Promise object', () => {
      const stream = mediaRecorder.createMediaStream();

      expect(stream instanceof Promise).toBeTruthy();
    });

    it('should reject with an error if getUserMedia is not available', done => {
      spyOnProperty(navigator, 'mediaDevices').and.returnValue({});

      mediaRecorder
        .createMediaStream()
        .then(done.fail)
        .catch(({ message }) => {
          expect(message).toBe(
            'navigator.mediaDevices.getUserMedia not implemented in this browser',
          );
          done();
        });
    });
  });
});