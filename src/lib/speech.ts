/** Browser-side voice helpers: WAV mic recording + interviewer audio playback. */

function encodeWav(chunks: Float32Array[], sampleRate: number, targetRate = 16000): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  // Downsample to targetRate for a smaller upload.
  const ratio = sampleRate / targetRate;
  const outLength = Math.floor(merged.length / ratio);
  const samples = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) samples[i] = merged[Math.floor(i * ratio)] ?? 0;

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let pos = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export type LevelListener = (level: number) => void;

/** Records microphone audio as PCM and yields a complete WAV blob on stop. */
export class MicRecorder {
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private stream: MediaStream | null = null;

  constructor(private onLevel?: LevelListener) {}

  async start(stream?: MediaStream) {
    this.chunks = [];
    this.stream = stream ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.source = ctx.createMediaStreamSource(this.stream);
    this.processor = ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(input));
      if (this.onLevel) {
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i]! * input[i]!;
        this.onLevel(Math.min(1, Math.sqrt(sum / input.length) * 6));
      }
    };
    this.source.connect(this.processor);
    this.processor.connect(ctx.destination);
  }

  /** Stops recording and returns the WAV blob (null if nothing usable was captured). */
  async stop(ownsStream = true): Promise<Blob | null> {
    const ctx = this.ctx;
    this.processor?.disconnect();
    this.source?.disconnect();
    this.processor = null;
    this.source = null;
    if (ownsStream) this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    const rate = ctx?.sampleRate ?? 48000;
    await ctx?.close().catch(() => {});
    this.ctx = null;
    this.onLevel?.(0);
    if (!this.chunks.length) return null;
    const blob = encodeWav(this.chunks, rate);
    this.chunks = [];
    return blob.size > 4096 ? blob : null;
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

let currentAudio: HTMLAudioElement | null = null;

/** Plays base64 audio; resolves when playback finishes. */
export function playBase64Audio(base64: string, mimeType = "audio/mpeg"): Promise<void> {
  stopSpeaking();
  return new Promise((resolve) => {
    const audio = new Audio(`data:${mimeType};base64,${base64}`);
    currentAudio = audio;
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

/** Fallback voice using the browser's built-in synthesizer. */
export function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    utter.lang = "en-IN";
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}

/** Strips markdown so the interviewer voice doesn't read symbols aloud. */
export function toSpeakableText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[*_`#>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
