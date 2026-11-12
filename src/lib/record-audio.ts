/** Re-encode any browser-recorded audio (webm/mp4/ogg) as 16 kHz mono 16-bit WAV, which the server can send to Gemini. */
async function toWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();

  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);

  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  str(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  pcm.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return new Blob([view], { type: "audio/wav" });
}

/** Start recording the microphone. `stop()` resolves with a WAV blob; `cancel()` discards the recording. */
export async function startRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  const release = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        rec.onstop = async () => {
          release();
          try {
            resolve(await toWav(new Blob(chunks, { type: rec.mimeType })));
          } catch (e) {
            reject(e);
          }
        };
        rec.stop();
      }),
    cancel: () => {
      rec.onstop = null;
      try {
        rec.stop();
      } catch {}
      release();
    },
  };
}
