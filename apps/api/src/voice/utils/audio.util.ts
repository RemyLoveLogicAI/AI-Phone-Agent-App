/**
 * Audio utilities for voice processing
 * Handles conversions between different audio formats:
 * - 16kHz PCM (Deepgram, browser)
 * - 8kHz μ-law (Twilio)
 * - Base64 encoding/decoding
 */

// μ-law encoding/decoding tables for Twilio audio
const MULAW_MAX = 0x1fff;
const MULAW_BIAS = 33;

/**
 * Convert linear PCM to μ-law (for Twilio)
 */
export function pcmToMulaw(pcm: number): number {
  let sign: number;
  let exponent: number;
  let mantissa: number;
  let mulaw: number;

  sign = (pcm & 0x8000) >> 8;
  if (sign !== 0) {
    pcm = -pcm;
  }

  pcm = Math.min(pcm, MULAW_MAX);
  pcm += MULAW_BIAS;

  exponent = Math.floor(Math.log(pcm) / Math.log(2)) - 7;
  if (exponent < 0) exponent = 0;

  mantissa = (pcm >> (exponent + 3)) & 0x0f;
  mulaw = ~(sign | (exponent << 4) | mantissa);

  return mulaw & 0xff;
}

/**
 * Convert μ-law to linear PCM (from Twilio)
 */
export function mulawToPcm(mulaw: number): number {
  mulaw = ~mulaw;
  const sign = mulaw & 0x80;
  const exponent = (mulaw >> 4) & 0x07;
  const mantissa = mulaw & 0x0f;

  let sample = mantissa << (exponent + 3);
  sample += MULAW_BIAS;
  sample <<= 1;

  if (sign !== 0) {
    sample = -sample;
  }

  return sample;
}

/**
 * Convert Buffer of μ-law audio to PCM Int16Array
 */
export function mulawBufferToPcm(mulawBuffer: Buffer): Int16Array {
  const pcmArray = new Int16Array(mulawBuffer.length);
  for (let i = 0; i < mulawBuffer.length; i++) {
    pcmArray[i] = mulawToPcm(mulawBuffer[i]);
  }
  return pcmArray;
}

/**
 * Convert Int16Array PCM to μ-law Buffer
 */
export function pcmBufferToMulaw(pcmBuffer: Int16Array): Buffer {
  const mulawBuffer = Buffer.alloc(pcmBuffer.length);
  for (let i = 0; i < pcmBuffer.length; i++) {
    mulawBuffer[i] = pcmToMulaw(pcmBuffer[i]);
  }
  return mulawBuffer;
}

/**
 * Resample audio from one sample rate to another
 * Simple linear interpolation resampling
 */
export function resampleAudio(
  input: Int16Array,
  inputSampleRate: number,
  outputSampleRate: number,
): Int16Array {
  if (inputSampleRate === outputSampleRate) {
    return input;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;

    if (index + 1 < input.length) {
      // Linear interpolation
      output[i] = Math.round(
        input[index] * (1 - fraction) + input[index + 1] * fraction,
      );
    } else {
      output[i] = input[index];
    }
  }

  return output;
}

/**
 * Convert Float32Array audio (from browser) to Int16Array PCM
 */
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = Math.round(sample * 32767);
  }
  return int16Array;
}

/**
 * Convert Int16Array PCM to Float32Array (for browser playback)
 */
export function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32767;
  }
  return float32Array;
}

/**
 * Convert base64 to Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Convert Buffer to base64
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Process Twilio media payload to PCM
 * Twilio sends base64-encoded μ-law audio at 8kHz
 * Returns 16kHz PCM Int16Array for ASR
 */
export function processTwilioAudioToAsr(
  twilioPayload: string,
): Int16Array {
  // Decode base64 to buffer
  const mulawBuffer = base64ToBuffer(twilioPayload);

  // Convert μ-law to PCM
  const pcm8k = mulawBufferToPcm(mulawBuffer);

  // Resample from 8kHz to 16kHz
  const pcm16k = resampleAudio(pcm8k, 8000, 16000);

  return pcm16k;
}

/**
 * Process ASR output PCM to Twilio format
 * Converts 16kHz PCM to 8kHz μ-law base64 for Twilio
 */
export function processTtsToTwilio(
  pcm16k: Int16Array,
): string {
  // Resample from 16kHz to 8kHz
  const pcm8k = resampleAudio(pcm16k, 16000, 8000);

  // Convert PCM to μ-law
  const mulawBuffer = pcmBufferToMulaw(pcm8k);

  // Encode to base64
  return bufferToBase64(mulawBuffer);
}

/**
 * Process browser audio (Float32) to ASR format
 */
export function processBrowserAudioToAsr(
  float32Array: Float32Array,
  sampleRate: number,
): Int16Array {
  // Convert float32 to int16
  let pcm = float32ToInt16(float32Array);

  // Resample to 16kHz if needed
  if (sampleRate !== 16000) {
    pcm = resampleAudio(pcm, sampleRate, 16000);
  }

  return pcm;
}

/**
 * Process TTS output to browser format
 */
export function processTtsToBrowser(
  pcm16k: Int16Array,
): Float32Array {
  return int16ToFloat32(pcm16k);
}

/**
 * Chunk audio into smaller pieces for streaming
 */
export function* chunkAudio(
  audio: Int16Array,
  chunkSize: number,
): Generator<Int16Array> {
  for (let i = 0; i < audio.length; i += chunkSize) {
    yield audio.slice(i, i + chunkSize);
  }
}
