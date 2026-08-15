import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TTS_MODEL = "openai/gpt-4o-mini-tts";
const STT_MODEL = "openai/gpt-4o-transcribe";

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

const SpeakInput = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().optional(),
});

/** Turns the interviewer's question into natural speech (base64 mp3). */
export const synthesizeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SpeakInput.parse(input))
  .handler(async ({ data }) => {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: data.text,
        voice: data.voice ?? "alloy",
        response_format: "mp3",
        instructions:
          "Speak like a calm, professional campus placement interviewer. Clear, measured pace, friendly but neutral.",
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Voice service is busy. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Speech synthesis failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const buffer = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buffer.length; i += 8192) {
      binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
    }
    return { audio: btoa(binary), mimeType: "audio/mpeg" };
  });

const TranscribeInput = z.object({
  audio: z.string().min(100), // base64 wav
});

/** Converts the candidate's recorded answer (WAV) into text. */
export const transcribeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data }) => {
    const binary = atob(data.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.length < 4096) throw new Error("That recording was too short — please try again.");
    if (bytes.length > 20 * 1024 * 1024) throw new Error("Recording too long. Keep answers under a few minutes.");

    const form = new FormData();
    form.append("model", STT_MODEL);
    form.append("file", new Blob([bytes], { type: "audio/wav" }), "answer.wav");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Transcription is busy. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Transcription failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const payload = (await res.json()) as { text?: string };
    return { text: (payload.text ?? "").trim() };
  });
