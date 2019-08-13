/**
 * @module recorder
 */

import MediaRecorder from 'audio-recorder-polyfill';
import AmplitudePlugin from './plugins/amplitude';

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
const BYTES_PER_SAMPLE = 2;

export const DEFAULT_AUDIO_FORMAT = 'audio/wav';
export const DEFAULT_CHANNELS = 1;
export const DEFAULT_SAMPLE_WIDTH = 8 * BYTES_PER_SAMPLE;
export const DEFAULT_SAMPLE_RATE = audioContext.sampleRate;

/**
 * Override or set the MediaRecorder to the window object.
 *
 * @param {string} [ns='MediaRecorder'] - Give the object another name if required.
 */
export function addAsGlobal(ns = 'MediaRecorder') {
  if (window[ns]) {
    window[`Original${ns}`] = window[ns];
  }

  window[ns] = MediaRecorder;
}

/**
 * Uses the imported MediaRecorder to create a new MediaRecorder object from.
 * Note that the browser default is NOT used. This is because the support of the MediaRecorder API
 * is still not large.
 *
 * Another reason to not want to use the default is that the ITSLanguage backend
 * currently only supports WAVE as input.
 *
 * @param {MediaStream} stream - Stream to record from.
 * @param {Object[]} [plugins = []] - Optionally an array with plugins to enable
 * on the recorder created.
 * @param {boolean} [setToWindow=false] - Override or set MediaRecorder to the
 * window object.
 * @param {string} [asObject='MediaRecorder'] - Optionally give the object
 * another name than MediaRecorder.
 * @returns {MediaRecorder} - An instance of the created MediaRecorder.
 */
export function createRecorder(
  stream = null,
  plugins = [],
  setToWindow = false,
  asObject = 'MediaRecorder',
) {
  if (setToWindow) {
    addAsGlobal(asObject);
  }

  // Create the MediaRecorder object.
  const recorder = new MediaRecorder(stream);

  // Prepare the plugins object, here we store an instance of a plugin.
  recorder.plugins = [];

  // Enhance the recorder with some (or none) plugins.
  plugins.forEach(plugin => {
    // Try to initialize the plugin.
    // And yes, if there is no `initPlugin` method, nothing happens!
    /* istanbul ignore else */
    if (plugin.applyPlugin) {
      plugin.applyPlugin(recorder);

      // Store the plugin!
      recorder.plugins.push(plugin);
    }
  });

  // We need to add a function "getAudioSpecs" to be compliant with the itslanguage backend...
  recorder.getAudioSpecs = () => ({
    audioFormat: recorder.mimeType || DEFAULT_AUDIO_FORMAT,
    audioParameters: {
      channels: DEFAULT_CHANNELS,
      sampleWidth: DEFAULT_SAMPLE_WIDTH,
      frameRate: DEFAULT_SAMPLE_RATE,
      sampleRate: DEFAULT_SAMPLE_RATE,
    },
  });

  return recorder;
}

/**
 * Create a stream to connect the MediaRecorder to.
 * Note, if this functions throws an error that getUserMedia is not implemented, consider
 * adding a polyfill to your project that adds support for the getUserMedia function.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 * @returns {Promise} - Promise with either the stream, or else an error message.
 */
export function createMediaStream() {
  if (typeof navigator.mediaDevices.getUserMedia === 'undefined') {
    return Promise.reject(
      new Error(
        'navigator.mediaDevices.getUserMedia not implemented in this browser',
      ),
    );
  }
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

/**
 * Factory function to create an AmplitudePlugin. Use the result of this
 * function to pass to the plugin list of the recorder.
 *
 * @param {object} [options = {}] - Options to pass to the AmplitudePlugin.
 * @returns { AmplitudePlugin } - Instance of the AmplitudePlugin.
 */
export function createAmplitudePlugin(options = {}) {
  return new AmplitudePlugin(options);
}
