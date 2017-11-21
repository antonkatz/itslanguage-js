import * as Stopwatch from '../src/audio/tools';
import AudioPlayer from '../src/audio/audio-player';
import WebAudioPlayer from '../src/audio/web-audio-player';

describe('Audio player', () => {
  let oldMedia;
  let oldAudio;

  beforeEach(() => {
    oldMedia = window.Media;
    oldAudio = window.Audio;
    spyOn(AudioPlayer.prototype, '_playbackCompatibility');
    spyOn(AudioPlayer.prototype, '_getPlayer');
  });

  afterEach(() => {
    window.Media = oldMedia;
    window.Audio = oldAudio;
  });

  it('should construct with event functionality', () => {
    const player = new AudioPlayer();
    let playbackStoppedCb = null;
    player._emitter = jasmine.createSpyObj('_emitter', ['on', 'off', 'emit']);
    player.resetEventListeners();
    player.addEventListener('evt1', () => {});
    player.removeEventListener('evt1', () => {});
    player._emitter.emit('evt1', ['args']);
    player._emitter.emit('evt2');
    expect(player._playbackCompatibility).toHaveBeenCalledTimes(1);
    expect(player._getPlayer).toHaveBeenCalledTimes(1);
    const callbacks = player._getPlayer.calls.mostRecent().args[0];
    expect(player.resetEventListeners).toEqual(jasmine.any(Function));
    expect(player.addEventListener).toEqual(jasmine.any(Function));
    expect(player.removeEventListener).toEqual(jasmine.any(Function));
    expect(player._emitter.emit).toEqual(jasmine.any(Function));
    for (const callback in callbacks) {
      if (callback === 'playbackStoppedCb') {
        playbackStoppedCb = callbacks[callback];
      }
      callbacks[callback]();
    }
    expect(player._emitter.on).toHaveBeenCalledWith('evt1', jasmine.any(Function));
    expect(player._emitter.off).toHaveBeenCalledWith('evt1', jasmine.any(Function));
    expect(player._emitter.emit).toHaveBeenCalledWith('evt1', ['args']);
    expect(player._emitter.emit).toHaveBeenCalledWith('evt2');
    player._stopwatch = jasmine.createSpyObj('_stopwatch', ['stop']);
    playbackStoppedCb();
    expect(player._stopwatch.stop).toHaveBeenCalledTimes(1);
  });

  describe('Compatibility', () => {
    beforeEach(() => {
      window.Media = jasmine.createSpy();
      window.Audio = jasmine.createSpy();
    });

    it('should recognize playback compatibility when all are available', () => {
      window.Audio.and.returnValue({
        canPlayType: () => 1
      });
      const player = new AudioPlayer();
      player._playbackCompatibility.and.callThrough();
      player._playbackCompatibility();
      expect(player.canUseAudio).toBeTruthy();
    });

    it('should recognize playback compatibility when only HTML5 is available', () => {
      window.Media = undefined;
      window.Audio.and.returnValue({
        canPlayType: () => 1
      });
      const player = new AudioPlayer();
      player._playbackCompatibility.and.callThrough();
      player._playbackCompatibility();
      expect(player.canUseAudio).toBeTruthy();
    });

    it('should recognize playback compatibility when only HTML5 is available, but has no methods.', () => {
      window.Media = undefined;
      window.Audio.and.returnValue({
        canPlayType: 'Error'
      });
      const player = new AudioPlayer();
      player._playbackCompatibility.and.callThrough();
      expect(() => {
        player._playbackCompatibility();
      }).toThrowError('Unable to detect audio playback capabilities');
    });

    it('should recognize playback compatibility when none are available', () => {
      window.Media = undefined;
      window.Audio = undefined;
      const player = new AudioPlayer();
      player._playbackCompatibility.and.callThrough();
      expect(() => {
        player._playbackCompatibility();
      }).toThrowError('Some form of audio playback capability is required');
    });

    it('should recognize playback compatibility when neither wave nor mp3 can be played', () => {
      window.Media = undefined;
      window.Audio.and.returnValue({
        canPlayType: () => ''
      });
      const player = new AudioPlayer();
      player._playbackCompatibility.and.callThrough();
      expect(() => {
        player._playbackCompatibility();
      }).toThrowError('Native Wave or MP3 playback is required');
    });
  });

  it('should get the best player when it can use HTML5', () => {
    const oldAudio_ = window.Audio;
    window.Audio = jasmine.createSpy().and.returnValue({
      canPlayType: () => 1
    });
    spyOn(WebAudioPlayer.prototype, '_initPlayer');
    const player = new AudioPlayer();
    player.canUseAudio = true;
    AudioPlayer.prototype._getPlayer.and.callThrough();
    const result = player._getPlayer();
    expect(result).toEqual(jasmine.any(WebAudioPlayer));
    window.Audio = oldAudio_;
  });

  it('should get the best player when it can use neither', () => {
    const player = new AudioPlayer();
    player.canUseAudio = false;
    AudioPlayer.prototype._getPlayer.and.callThrough();
    expect(() => {
      player._getPlayer();
    }).toThrowError('Unable to find a proper player.');
  });

  it('should load from an url with preload', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['load']);
    const loadCb = jasmine.createSpy();
    spyOn(player._emitter, 'emit');
    spyOn(player, 'reset');
    player.load('url', true, loadCb);
    expect(player._player.load).toHaveBeenCalled();
    expect(player._emitter.emit).not.toHaveBeenCalled();

    expect(player.reset).toHaveBeenCalledTimes(1);
  });

  it('should load from an url without preload', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['load']);
    const loadCb = jasmine.createSpy();
    spyOn(player._emitter, 'emit');
    spyOn(player, 'reset');
    player.load('url', false, loadCb);
    expect(player._player.load).toHaveBeenCalledWith('url', false, loadCb);
    expect(player._emitter.emit).toHaveBeenCalledWith('canplay', []);
    expect(player.reset).toHaveBeenCalledTimes(1);
  });

  it('should reset', () => {
    const player = new AudioPlayer();
    spyOn(player, 'stop');
    spyOn(player._emitter, 'emit');
    player._player = jasmine.createSpyObj('player', ['reset']);
    player.reset();
    expect(player._player.reset).toHaveBeenCalledTimes(1);
    expect(player.stop).toHaveBeenCalledTimes(1);
    expect(player._emitter.emit).toHaveBeenCalledTimes(1);
  });

  it('should play', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['play', 'isPlaying']);
    player._player.isPlaying.and.returnValue(false);
    player.play(40);
    expect(player._player.play).toHaveBeenCalledWith(40);
  });

  it('should not play when already playing', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['play', 'isPlaying']);
    player._player.isPlaying.and.returnValue(true);
    player.play(40);
    expect(player._player.play).not.toHaveBeenCalled();
  });

  it('should stop', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['stop']);
    player.stop();
    expect(player._player.stop).toHaveBeenCalledTimes(1);
  });

  it('should pause', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['pause']);
    player.pause();
    expect(player._player.pause).toHaveBeenCalledTimes(1);
  });

  it('should toggle playback when playing', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['play', 'pause', 'isPlaying']);
    player._player.isPlaying.and.returnValue(true);
    player.togglePlayback();
    expect(player._player.isPlaying).toHaveBeenCalledTimes(1);
    expect(player._player.pause).toHaveBeenCalledTimes(1);
    expect(player._player.play).not.toHaveBeenCalled();
  });

  it('should toggle playback when not playing', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['play', 'pause', 'isPlaying']);
    player._player.isPlaying.and.returnValue(false);
    player.togglePlayback();
    expect(player._player.isPlaying).toHaveBeenCalledTimes(2);
    expect(player._player.pause).not.toHaveBeenCalledTimes(1);
    expect(player._player.play).toHaveBeenCalledTimes(1);
  });

  it('should preload', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['preload']);
    player.preload();
    expect(player._player.preload).toHaveBeenCalledTimes(1);
  });

  it('should scrub', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['scrub']);
    player.scrub(50);
    expect(player._player.scrub).toHaveBeenCalledWith(50);
  });

  it('should scrub and correct errors', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['scrub']);
    player.scrub(120);
    expect(player._player.scrub).toHaveBeenCalledWith(100);

    player.scrub(-9);
    expect(player._player.scrub).toHaveBeenCalledWith(0);
  });

  it('should get buffer fill', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['getBufferFill']);
    player._player.getBufferFill.and.returnValue(10);
    const result = player.getBufferFill();
    expect(player._player.getBufferFill).toHaveBeenCalledTimes(1);
    expect(result).toEqual(10);
  });

  it('should get current time', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['getCurrentTime']);
    player._player.getCurrentTime.and.returnValue(10);
    const result = player.getCurrentTime();
    expect(player._player.getCurrentTime).toHaveBeenCalledTimes(1);
    expect(result).toEqual(10);
  });

  it('should get duration', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['getDuration']);
    player._player.getDuration.and.returnValue(10);
    const result = player.getDuration();
    expect(player._player.getDuration).toHaveBeenCalledTimes(1);
    expect(result).toEqual(10);
  });

  it('should return playing state', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['isPlaying']);
    player._player.isPlaying.and.returnValue(true);
    const result = player.isPlaying();
    expect(player._player.isPlaying).toHaveBeenCalledTimes(1);
    expect(result).toBeTruthy();
  });

  it('should return ready state', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['canPlay']);
    player._player.canPlay.and.returnValue(true);
    const result = player.canPlay();
    expect(player._player.canPlay).toHaveBeenCalledTimes(1);
    expect(result).toBeTruthy();
  });

  it('should bind and return stopwatch', () => {
    const player = new AudioPlayer();
    player._player = {
      sound: {
        playbackRate: 1
      }
    };
    const cb = jasmine.createSpy();
    const fakeWatch = jasmine.createSpy();
    spyOn(Stopwatch, 'default').and.callFake(callback => {
      fakeWatch._tickCb = callback;
      callback(10);
      return fakeWatch;
    });
    spyOn(player, 'getDuration').and.returnValue(1);
    const result = player.bindStopwatch(cb);
    expect(result).toEqual(fakeWatch);
  });

  it('should bind and correct timer errors', () => {
    const player = new AudioPlayer();
    const cb = jasmine.createSpy();
    spyOn(Stopwatch, 'default').and.callFake(callback => callback(15));
    spyOn(player, 'getDuration').and.returnValue(1);
    player._player = jasmine.createSpyObj('player', ['bindStopwatch']);
    player._player.sound = {
      playbackRate: 1
    };
    player.bindStopwatch(cb);
    expect(cb).toHaveBeenCalledWith(10);
  });

  it('should bind the play function to the stopwatch', () => {
    const fakePlayer = jasmine.createSpyObj('stopwatch', ['play', 'getCurrentTime', 'isPlaying']);
    fakePlayer.getCurrentTime.and.returnValue(1);
    fakePlayer.isPlaying.and.returnValue(false);
    const fakeWatch = jasmine.createSpyObj('stopwatch', ['start']);
    fakeWatch._value = 10;
    const player = new AudioPlayer();
    player._player = fakePlayer;
    player._stopwatch = fakeWatch;
    player.play();
    expect(fakeWatch._value).toEqual(10);
    expect(fakeWatch.start).toHaveBeenCalledTimes(1);
  });

  it('should bind the pause function to the stopwatch', () => {
    const fakePlayer = jasmine.createSpyObj('stopwatch', ['pause']);
    const fakeWatch = jasmine.createSpyObj('stopwatch', ['stop']);
    const player = new AudioPlayer();
    player._player = fakePlayer;
    player._stopwatch = fakeWatch;
    player.pause();
    expect(fakeWatch.stop).toHaveBeenCalledTimes(1);
  });

  it('should bind the stop function to the stopwatch', () => {
    const fakePlayer = jasmine.createSpyObj('stopwatch', ['stop']);
    const fakeWatch = jasmine.createSpyObj('stopwatch', ['reset', 'stop']);
    const player = new AudioPlayer();
    player._player = fakePlayer;
    player._stopwatch = fakeWatch;
    player.stop();
    expect(fakeWatch.reset).toHaveBeenCalledTimes(1);
    expect(fakeWatch.stop).toHaveBeenCalledTimes(1);
  });

  it('should bind a stopwatch and scrub audio', () => {
    const fakeWatch = jasmine.createSpyObj('_stopwatch', ['reset']);
    fakeWatch._value = 0;
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['scrub', 'getCurrentTime']);
    player._player.getCurrentTime.and.returnValue(1);
    player._stopwatch = fakeWatch;
    player.scrub(50);
    expect(player._player.getCurrentTime).toHaveBeenCalledTimes(1);
    expect(fakeWatch._value).toEqual(10);
  });

  it('should bind the reset function with a stopwatch', () => {
    const player = new AudioPlayer();
    player.stop = jasmine.createSpy();
    player._player = jasmine.createSpyObj('player', ['reset']);
    player.reset();
    expect(player.stop).toHaveBeenCalledTimes(1);
  });

  it('should change the playbackrate of the audio', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['setPlaybackRate']);
    player.setPlaybackRate(2);
    expect(player._player.setPlaybackRate).toHaveBeenCalledTimes(1);
    expect(player._player.setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it('should get the playbackrate of the audio', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['getPlaybackRate']);
    player.getPlaybackRate();
    expect(player._player.getPlaybackRate).toHaveBeenCalledTimes(1);
  });

  it('should set the volume of the audio', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['setAudioVolume', 'getAudioVolume']);
    player.setAudioVolume(0.2);
    expect(player._player.setAudioVolume).toHaveBeenCalledTimes(1);
    expect(player._player.setAudioVolume).toHaveBeenCalledWith(0.2);
    expect(player._audioMuted).toBeFalsy();
  });

  it('should set the volume of the audio to zero and mute', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['setAudioVolume', 'getAudioVolume']);
    player.setAudioVolume(0);
    expect(player._player.setAudioVolume).toHaveBeenCalledTimes(1);
    expect(player._player.setAudioVolume).toHaveBeenCalledWith(0);
    expect(player._audioMuted).toBeTruthy();
  });

  it('should get the volume of the audio', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['setAudioVolume', 'getAudioVolume']);
    player._player.getAudioVolume.and.returnValue(0.5);
    const result = player.getAudioVolume(0.2);
    expect(player._player.getAudioVolume).toHaveBeenCalledTimes(1);
    expect(result).toEqual(0.5);
  });

  it('should set the mute of the audio true', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['setAudioVolume', 'getAudioVolume']);
    player.setAudioMute(true);
    expect(player._player.setAudioVolume).toHaveBeenCalledTimes(1);
    expect(player._player.setAudioVolume).toHaveBeenCalledWith(0);
    expect(player._audioMuted).toBeTruthy();
  });

  it('should unmute the audio after muting', () => {
    const player = new AudioPlayer();
    spyOn(player, 'toggleAudioMute').and.callThrough();
    player._player = jasmine.createSpyObj('player', ['setAudioVolume', 'getAudioVolume']);
    player._player.getAudioVolume.and.returnValue(0.5);
    player.setAudioMute(true);
    expect(player._audioMuted).toBeTruthy();

    player._player.getAudioVolume.and.returnValue(0);
    player.setAudioMute(false);
    expect(player._audioMuted).toBeFalsy();

    expect(player._player.setAudioVolume).toHaveBeenCalledTimes(2);
    expect(player._player.setAudioVolume).toHaveBeenCalledWith(0);
    expect(player._player.setAudioVolume).toHaveBeenCalledWith(0.5);
  });

  it('should unmute the audio with a previous changed audiolevel', () => {
    const audioLevel = 0.5;
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['setAudioVolume', 'getAudioVolume']);
    player._player.getAudioVolume.and.returnValue(audioLevel);
    player.setAudioVolume(audioLevel);
    player.setAudioMute(true);
    player.setAudioMute(false);
    expect(player._player.setAudioVolume).toHaveBeenCalledWith(0);
    expect(player._player.setAudioVolume).toHaveBeenCalledWith(audioLevel);
    expect(player._player.setAudioVolume).toHaveBeenCalledTimes(3);
  });

  it('should get the _audioMuted property', () => {
    const player = new AudioPlayer();
    const result = player.isAudioMuted();
    expect(result).toBeFalsy();
  });

  it('should get the _audioMuted property after muting', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['setAudioVolume', 'getAudioVolume']);
    player._player.getAudioVolume.and.returnValue(0.5);
    player.setAudioMute(true);
    const result = player.isAudioMuted();
    expect(result).toBeTruthy();
  });

  it('should toggle the mute state on and off', () => {
    const player = new AudioPlayer();
    player._player = jasmine.createSpyObj('player', ['setAudioVolume', 'getAudioVolume']);
    player._player.getAudioVolume.and.returnValue(1);
    player.toggleAudioMute();
    player._player.getAudioVolume.and.returnValue(0);
    expect(player._player.setAudioVolume).toHaveBeenCalledTimes(1);
    expect(player._player.setAudioVolume).toHaveBeenCalledWith(0);
    player.toggleAudioMute();
    expect(player._player.setAudioVolume).toHaveBeenCalledTimes(2);
    expect(player._player.setAudioVolume).toHaveBeenCalledWith(1);
  });
});

