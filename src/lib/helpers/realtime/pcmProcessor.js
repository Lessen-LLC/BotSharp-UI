
export const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {

  // send and clear buffer every 2048 samples, 
  // which at 16khz is about 8 times a second,
  // or at 24khz is about 11 times a second
  buffer = new Int16Array(2048);

  // current write index
  bufferWriteIndex = 0;

  speaking = false;
  threshold = 0.1;

  constructor() {
    super();
  }

  /**
   * @param inputs Float32Array[][] [input#][channel#][sample#] so to access first inputs 1st channel inputs[0][0]
   * @param outputs Float32Array[][]
   */
  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      this.speaking = channel0.some(sample => Math.abs(sample) >= this.threshold);
      this.processChunk(channel0);
    }
    return true;
  }

  sendAndClearBuffer(){
    this.port.postMessage({
      event: "chunk",
      data: {
        speaking: this.speaking,
        int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
      },
    });
    this.bufferWriteIndex = 0;
  }

  processChunk(float32Array) {
    const l = float32Array.length;
    
    for (let i = 0; i < l; i++) {
      // convert float32 -1 to 1 to int16 -32768 to 32767
      const int16Value = float32Array[i] * 32768;
      this.buffer[this.bufferWriteIndex++] = int16Value;
      if (this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }

    if (this.bufferWriteIndex >= this.buffer.length) {
      this.sendAndClearBuffer();
    }
  }
}
`;