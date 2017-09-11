import * as MediaRecorder from '../src/audio/media-recorder';
import * as WebAudioRecorder from '../src/audio/web-audio-recorder';
import AudioRecorder from '../src/audio/audio-recorder';
import Stopwatch from '../src/audio/tools';
import uuid from 'uuid';

describe('Audio recorder', () => {
  beforeEach(() => {
    spyOn(AudioRecorder.prototype, '_getBestRecorder').and.returnValue('recorder');
    spyOn(AudioRecorder.prototype, '_recordingCompatibility');
  });

  it('should construct with event functionality', () => {
    const recorder = new AudioRecorder();
    recorder._emitter = jasmine.createSpyObj('_emitter', ['on', 'off', 'emit']);
    recorder.addEventListener('evt1', () => {});
    recorder.removeEventListener('evt1', () => {});
    recorder.fireEvent('evt1', ['args']);
    recorder.fireEvent('evt2');
    recorder.removeAllEventListeners();
    expect(recorder._emitter.on).toHaveBeenCalledWith('evt1', jasmine.any(Function));
    expect(recorder._emitter.off).toHaveBeenCalledWith('evt1', jasmine.any(Function));
    expect(recorder._emitter.emit).toHaveBeenCalledWith('evt1', 'args');
    expect(recorder._emitter.emit).toHaveBeenCalledWith('evt2');
  });

  it('should request microphone access', done => {
    const fakeStream = jasmine.createSpyObj('stream', ['getAudioTracks']);
    fakeStream.getAudioTracks.and.returnValue(['1']);
    window.navigator.mediaDevices.getUserMedia = jasmine.createSpy().and.callFake(() => Promise.resolve(fakeStream));
    const recorder = new AudioRecorder();
    recorder.audioContext = 'context';
    spyOn(console, 'log');
    spyOn(recorder, '_startUserMedia').and.returnValue('started media');
    spyOn(recorder, 'fireEvent').and.callFake(() => {
      expect(console.log).toHaveBeenCalledWith('Got audio tracks:', 1);
      expect(recorder.userMediaApproval).toBeTruthy();
      expect(recorder._startUserMedia).toHaveBeenCalledTimes(1);
      expect(recorder.fireEvent).toHaveBeenCalledWith('ready', ['context', 'started media']);
      done();
    });
    recorder.canMediaDevicesGetUserMedia = true;
    recorder.canGetUserMedia = true;
    recorder.requestUserMedia();
  });

  it('should request microphone access without audiotracks', done => {
    const fakeStream = jasmine.createSpyObj('stream', ['getAudioTracks']);
    window.navigator.mediaDevices.getUserMedia = jasmine.createSpy().and.callFake(() => Promise.resolve(fakeStream));
    fakeStream.getAudioTracks.and.returnValue({});
    const recorder = new AudioRecorder();
    recorder.audioContext = 'context';
    spyOn(console, 'log');
    spyOn(recorder, '_startUserMedia').and.returnValue('started media');
    spyOn(recorder, 'fireEvent').and.callFake(() => {
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(recorder.userMediaApproval).toBeTruthy();
      expect(recorder._startUserMedia).toHaveBeenCalledWith(fakeStream);
      expect(recorder.fireEvent).toHaveBeenCalledWith('ready', ['context', 'started media']);
      done();
    });
    recorder.canMediaDevicesGetUserMedia = true;
    recorder.canGetUserMedia = true;
    recorder.requestUserMedia();
  });

  it('should request microphone access using media devices', () => {
    const recorder = new AudioRecorder();
    recorder.audioContext = 'context';
    const fakeStream = jasmine.createSpyObj('stream', ['getAudioTracks']);
    fakeStream.getAudioTracks.and.returnValue({});
    window.navigator.getUserMedia = jasmine.createSpy().and.callFake((options, successCb) => successCb(fakeStream));
    spyOn(console, 'log');
    spyOn(recorder, '_startUserMedia').and.returnValue('started media');
    spyOn(recorder, 'fireEvent');
    recorder.canMediaDevicesGetUserMedia = false;
    recorder.canGetUserMedia = true;
    recorder.requestUserMedia();
    expect(console.log).toHaveBeenCalledWith('Got getUserMedia stream');
    expect(recorder.userMediaApproval).toBeTruthy();
    expect(recorder._startUserMedia).toHaveBeenCalledWith(fakeStream);
    expect(recorder.fireEvent).toHaveBeenCalledWith('ready', ['context', 'started media']);
  });

  it('should request microphone access and handle errors', () => {
    const fakeStream = jasmine.createSpyObj('stream', ['getAudioTracks']);
    fakeStream.getAudioTracks.and.returnValue({});
    window.navigator.getUserMedia = jasmine.createSpy().and.callFake((options, successCb, failCb) =>
      failCb('error123'));
    const recorder = new AudioRecorder();
    recorder.audioContext = 'context';
    spyOn(console, 'log');
    spyOn(recorder, '_startUserMedia').and.returnValue('started media');
    spyOn(recorder, 'fireEvent');
    recorder.canMediaDevicesGetUserMedia = false;
    recorder.canGetUserMedia = true;
    expect(() => {
      recorder.requestUserMedia();
    }).toThrowError('No live audio input available or permitted');
    expect(console.log).toHaveBeenCalledWith('error123');
    expect(recorder.userMediaApproval).toBeFalsy();
    expect(recorder._startUserMedia).toHaveBeenCalledTimes(0);
    expect(recorder.fireEvent).not.toHaveBeenCalled();
  });

  it('should request microphone access when it cannot request any media', () => {
    const recorder = new AudioRecorder();
    spyOn(console, 'log');
    spyOn(recorder, '_startUserMedia');
    spyOn(recorder, 'fireEvent');
    recorder.canMediaDevicesGetUserMedia = false;
    recorder.canGetUserMedia = false;
    recorder.requestUserMedia();
    expect(console.log).not.toHaveBeenCalled();
    expect(recorder.userMediaApproval).toBeFalsy();
    expect(recorder._startUserMedia).toHaveBeenCalledTimes(0);
    expect(recorder.fireEvent).not.toHaveBeenCalled();
  });

  it('should start user media', () => {
    const recorder = new AudioRecorder();
    recorder.audioContext = jasmine.createSpyObj('audioContext', ['createMediaStreamSource', 'createGain']);
    const fakeMic = jasmine.createSpyObj('micInput', ['connect']);
    recorder.audioContext.createMediaStreamSource.and.returnValue(fakeMic);
    recorder.audioContext.createGain.and.returnValue('gainNode');
    const result = recorder._startUserMedia('stream');
    expect(recorder.audioContext.createMediaStreamSource).toHaveBeenCalledWith('stream');
    expect(recorder.audioContext.createGain).toHaveBeenCalledTimes(1);
    expect(recorder._getBestRecorder).toHaveBeenCalledWith('gainNode');
    expect(result).toEqual('gainNode');
  });

  it('should start user media without audioContext', () => {
    const oldContext = window.AudioContext;
    const recorder = new AudioRecorder();
    recorder.audioContext = null;
    const fakeContext = jasmine.createSpyObj('audioContext', ['createMediaStreamSource', 'createGain']);
    window.AudioContext = () => fakeContext;
    const fakeMic = jasmine.createSpyObj('micInput', ['connect']);
    fakeContext.createMediaStreamSource.and.returnValue(fakeMic);
    fakeContext.createGain.and.returnValue('gainNode');
    const result = recorder._startUserMedia('stream');
    expect(recorder.audioContext.createMediaStreamSource).toHaveBeenCalledWith('stream');
    expect(recorder.audioContext.createGain).toHaveBeenCalledTimes(1);
    expect(recorder._getBestRecorder).toHaveBeenCalledWith('gainNode');
    expect(result).toEqual('gainNode');
    window.AudioContext = oldContext;
  });

  it('should start user media without being able to create a source stream', () => {
    const oldContext = window.AudioContext;
    const recorder = new AudioRecorder();
    window.AudioContext = () => {};
    expect(() => {
      recorder._startUserMedia('stream');
    }).toThrowError('AudioContext has no property createMediaStreamSource');
    window.AudioContext = oldContext;
  });

  it('should get the best recorder with mediaRecorder implementation', () => {
    const fakeMediaRecorder = jasmine.createSpy();
    spyOn(MediaRecorder, 'default').and.returnValue(fakeMediaRecorder);
    const recorder = new AudioRecorder();
    recorder._getBestRecorder.and.callThrough();
    recorder.canUserMediaRecorder = true;
    recorder._settings = {
      forceWave: false
    };
    const result = recorder._getBestRecorder();
    expect(result).toEqual(fakeMediaRecorder);
  });

  it('should get the best recorder with HTML5', () => {
    const fakeWebAudioRecorder = jasmine.createSpy();
    spyOn(WebAudioRecorder, 'default').and.callFake((inputgain, callback) => {
      callback('data');
      return fakeWebAudioRecorder;
    });
    const recorder = new AudioRecorder();
    spyOn(recorder, 'streamCallback').and.callThrough();
    spyOn(recorder, 'fireEvent');
    recorder._getBestRecorder.and.callThrough();
    recorder.canUserMediaRecorder = false;
    recorder.canGetUserMedia = true;
    const result = recorder._getBestRecorder();
    expect(result).toEqual(fakeWebAudioRecorder);
    expect(recorder.streamCallback).toHaveBeenCalledWith('data');
    expect(recorder.fireEvent).toHaveBeenCalledWith('dataavailable', ['data']);
  });

  it('should get the best recorder when no proper recorder can be found', () => {
    const recorder = new AudioRecorder();
    recorder._getBestRecorder.and.callThrough();
    recorder.canUserMediaRecorder = false;
    recorder.canGetUserMedia = false;
    expect(() => {
      recorder._getBestRecorder();
    }).toThrowError('Unable to find a proper recorder.');
  });

  it('should require get user media with recorder', () => {
    const recorder = new AudioRecorder();
    recorder._recorder = {};
    const result = recorder._requireGetUserMedia();
    expect(result).toBeTruthy();
  });

  it('should require get user media without recorder', () => {
    const recorder = new AudioRecorder();
    spyOn(recorder, 'requestUserMedia');
    recorder._recorder = null;
    const result = recorder._requireGetUserMedia();
    expect(recorder.requestUserMedia).toHaveBeenCalledTimes(1);
    expect(result).toBeFalsy();
  });

  it('should set a new recording session id with given id', () => {
    const recorder = new AudioRecorder();
    const result = recorder.startRecordingSession(1);
    expect(result).toEqual(1);
    expect(recorder.activeRecordingId).toEqual(1);
  });

  it('should set a new recording session id without given id', () => {
    const recorder = new AudioRecorder();
    spyOn(uuid, 'v4').and.returnValue(1);
    recorder._recorder = jasmine.createSpyObj('recorder', ['record']);
    const result = recorder.startRecordingSession();
    expect(result).toEqual(1);
    expect(uuid.v4).toHaveBeenCalledTimes(1);
    expect(recorder.activeRecordingId).toEqual(1);
  });

  it('should start recording microphone input until stopped', () => {
    const recorder = new AudioRecorder();
    recorder._recorder = jasmine.createSpyObj('recorder', ['record']);
    const cb = jasmine.createSpy();
    recorder.activeRecordingId = undefined;
    spyOn(recorder, 'isRecording').and.returnValue(false);
    spyOn(recorder, '_requireGetUserMedia').and.returnValue(true);
    spyOn(recorder, 'startRecordingSession').and.callFake(() => {
      recorder.activeRecordingId = 1;
    });
    spyOn(recorder, 'fireEvent');
    const result = recorder.record(cb);
    expect(recorder._requireGetUserMedia).toHaveBeenCalledTimes(1);
    expect(recorder.isRecording).toHaveBeenCalledTimes(1);
    expect(recorder._recorder.record).toHaveBeenCalledTimes(1);
    expect(recorder.startRecordingSession).toHaveBeenCalledTimes(1);
    expect(recorder.fireEvent).toHaveBeenCalledWith('recording', [1]);
    expect(result).toEqual(cb);
  });

  it('should start recording microphone input until stopped without being able to get usermedia', () => {
    const recorder = new AudioRecorder();
    recorder._recorder = jasmine.createSpyObj('recorder', ['record']);
    const cb = jasmine.createSpy();
    spyOn(recorder, '_requireGetUserMedia').and.returnValue(false);
    const result = recorder.record(cb);
    expect(result).toEqual(undefined);
  });

  it('should start recording microphone input until stopped when already recording', () => {
    const recorder = new AudioRecorder();
    recorder._recorder = jasmine.createSpyObj('recorder', ['record']);
    const cb = jasmine.createSpy();
    spyOn(recorder, 'isRecording').and.returnValue(true);
    spyOn(recorder, '_requireGetUserMedia').and.returnValue(true);
    spyOn(recorder, 'startRecordingSession');
    spyOn(recorder, 'fireEvent');
    expect(() => {
      recorder.record(cb);
    }).toThrowError('Already recording, stop recording first.');
    expect(recorder._requireGetUserMedia).toHaveBeenCalledTimes(1);
    expect(recorder.isRecording).toHaveBeenCalledTimes(1);
  });

  it('should start recording microphone input until stopped with an active recording id', () => {
    const recorder = new AudioRecorder();
    recorder._recorder = jasmine.createSpyObj('recorder', ['record']);
    const cb = jasmine.createSpy();
    recorder.activeRecordingId = 1;
    spyOn(recorder, 'isRecording').and.returnValue(false);
    spyOn(recorder, '_requireGetUserMedia').and.returnValue(true);
    spyOn(recorder, 'startRecordingSession');
    spyOn(recorder, 'fireEvent');
    const result = recorder.record(cb);
    expect(recorder._requireGetUserMedia).toHaveBeenCalledTimes(1);
    expect(recorder.isRecording).toHaveBeenCalledTimes(1);
    expect(recorder._recorder.record).toHaveBeenCalledTimes(1);
    expect(recorder.startRecordingSession).toHaveBeenCalledTimes(0);
    expect(recorder.fireEvent).toHaveBeenCalledWith('recording', [1]);
    expect(result).toEqual(cb);
  });

  it('should stop recording when recording', () => {
    const response = {type: 'type'};
    const recorder = new AudioRecorder();
    recorder.activeRecordingId = 1;
    spyOn(recorder, 'fireEvent');
    recorder._recorder = jasmine.createSpyObj('recorder', ['isRecording', 'stop', 'getEncodedAudio']);
    recorder._recorder.isRecording.and.returnValue(true);
    recorder._recorder.getEncodedAudio.and.callFake(callback => {
      callback(response);
    });
    recorder.stop(false);
    expect(recorder._recorder.isRecording).toHaveBeenCalledTimes(1);
    expect(recorder._recorder.stop).toHaveBeenCalledTimes(1);
    expect(recorder._recorder.getEncodedAudio).toHaveBeenCalledWith(jasmine.any(Function));
    expect(recorder.fireEvent).toHaveBeenCalledWith('recorded', [1, response, false]);
  });

  it('should stop recording when not recording', () => {
    const recorder = new AudioRecorder();
    spyOn(recorder, 'fireEvent');
    recorder._recorder = jasmine.createSpyObj('recorder', ['isRecording', 'stop', 'getEncodedAudio']);
    recorder._recorder.isRecording.and.returnValue(false);
    recorder.stop(false);
    expect(recorder._recorder.isRecording).toHaveBeenCalledTimes(1);
    expect(recorder._recorder.stop).not.toHaveBeenCalled();
    expect(recorder._recorder.getEncodedAudio).not.toHaveBeenCalled();
    expect(recorder.fireEvent).not.toHaveBeenCalled();
  });

  it('should check for a recording in progress when not recording', () => {
    const recorder = new AudioRecorder();
    recorder._recorder = jasmine.createSpyObj('recorder', ['isRecording']);
    recorder._recorder.isRecording.and.returnValue(false);
    const result = recorder.isRecording();
    expect(result).toBeFalsy();
  });

  it('should check for a recording in progress when recording', () => {
    const recorder = new AudioRecorder();
    recorder._recorder = jasmine.createSpyObj('recorder', ['isRecording']);
    recorder._recorder.isRecording.and.returnValue(true);
    const result = recorder.isRecording();
    expect(result).toBeTruthy();
  });

  it('should check for a recording in progress recorder does not exist', () => {
    const recorder = new AudioRecorder();
    const result = recorder.isRecording();
    expect(result).toBeFalsy();
  });

  it('should check get audio specs', () => {
    const recorder = new AudioRecorder();
    recorder._recorder = jasmine.createSpyObj('recorder', ['getAudioSpecs']);
    recorder._recorder.getAudioSpecs.and.returnValue('specs');
    const result = recorder.getAudioSpecs();
    expect(result).toEqual('specs');
  });

  it('should toggle recording when recording', () => {
    const recorder = new AudioRecorder();
    spyOn(recorder, 'isRecording').and.returnValue(true);
    spyOn(recorder, 'stop');
    spyOn(recorder, 'record');
    recorder.toggleRecording();
    expect(recorder.isRecording).toHaveBeenCalledTimes(1);
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('should toggle recording when not recording', () => {
    const recorder = new AudioRecorder();
    spyOn(recorder, 'isRecording').and.returnValue(false);
    spyOn(recorder, 'stop');
    spyOn(recorder, 'record');
    recorder.toggleRecording();
    expect(recorder.isRecording).toHaveBeenCalledTimes(1);
    expect(recorder.stop).not.toHaveBeenCalled();
    expect(recorder.record).toHaveBeenCalledTimes(1);
  });

  it('should bind and return stopwatch', () => {
    const recorder = new AudioRecorder();
    const cb = jasmine.createSpy();
    const result = recorder.bindStopwatch(cb);
    expect(result).toEqual(jasmine.any(Stopwatch));
    expect(result._tickCb).toEqual(cb);
  });

  it('should bind the stop function to a stopwatch', () => {
    const fakeWatch = jasmine.createSpyObj('_stopwatch', ['start']);
    fakeWatch._value = 10;
    const recorder = new AudioRecorder();
    spyOn(recorder, '_requireGetUserMedia').and.returnValue(true);
    spyOn(recorder, 'isRecording').and.returnValue(false);
    spyOn(recorder, 'fireEvent');
    recorder._recorder = jasmine.createSpyObj('recorder', ['record']);
    recorder._stopwatch = fakeWatch;
    recorder.activeRecordingId = 1;
    recorder.record();
    expect(fakeWatch._value).toEqual(0);
    expect(fakeWatch.start).toHaveBeenCalledTimes(1);
  });

  it('should bind the stop function to a stopwatch', () => {
    const fakeWatch = jasmine.createSpyObj('stopwatch', ['stop']);
    const recorder = new AudioRecorder();
    spyOn(recorder, '_requireGetUserMedia').and.returnValue(true);
    spyOn(recorder, 'isRecording').and.returnValue(false);
    spyOn(recorder, 'fireEvent');
    recorder._recorder = jasmine.createSpyObj('recorder', ['isRecording', 'stop', 'getEncodedAudio']);
    recorder._recorder.isRecording.and.returnValue(true);
    recorder._stopwatch = fakeWatch;
    spyOn(recorder, 'stop').and.callThrough();
    recorder.stop();
    expect(fakeWatch.stop).toHaveBeenCalledTimes(1);
    expect(recorder.stop).toHaveBeenCalledTimes(1);
  });

  it('should check if the user has given permission after constructing', () => {
    const recorder = new AudioRecorder();
    expect(recorder.hasUserMediaApproval()).toBeFalsy();
  });

  it('should check if the user has given permission after denying permission', () => {
    const recorder = new AudioRecorder();
    recorder.userMediaApproval = false;
    expect(recorder.hasUserMediaApproval()).toBeFalsy();
  });

  it('should check if the user has given permission after giving permission', () => {
    const recorder = new AudioRecorder();
    recorder.userMediaApproval = true;
    expect(recorder.hasUserMediaApproval()).toBeTruthy();
  });
});
