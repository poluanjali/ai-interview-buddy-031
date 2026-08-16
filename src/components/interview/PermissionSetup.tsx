import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Camera,
  Mic,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

type Status = "idle" | "requesting" | "granted" | "denied" | "error";

type Props = {
  /** Called once the user has a usable stream (or chose to continue without devices). */
  onReady: (stream: MediaStream | null) => void;
};

type Failure = {
  title: string;
  detail: string;
  steps: string[];
};

function describeError(err: unknown): Failure {
  const name = (err as DOMException)?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      title: "Access was blocked",
      detail: "Your browser denied camera or microphone permission for this site.",
      steps: [
        "Click the lock / camera icon in the browser address bar.",
        'Set Camera and Microphone to "Allow" for this site.',
        "Reload the page, then press Try again below.",
        "On macOS, also check System Settings → Privacy & Security → Camera/Microphone and enable your browser.",
      ],
    };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return {
      title: "No camera or microphone found",
      detail: "We couldn't detect a usable device on this computer.",
      steps: [
        "Plug in a webcam or headset and press Try again.",
        "If you use a laptop with a privacy shutter or camera kill-switch, turn it on.",
        "Check your OS sound settings to confirm an input device is selected.",
        "You can still continue with a text-only interview below.",
      ],
    };
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return {
      title: "Your device is busy",
      detail: "Another app is already using the camera or microphone.",
      steps: [
        "Close Zoom, Google Meet, Teams, OBS or other video tabs.",
        "Close duplicate tabs of this app.",
        "Press Try again — if it still fails, restart your browser.",
      ],
    };
  }
  return {
    title: "Something went wrong",
    detail: "We couldn't start your camera and microphone.",
    steps: [
      "Make sure you're on a secure (https) or localhost page.",
      "Try Chrome, Edge or Safari — some in-app browsers block media access.",
      "Disable browser extensions that manage camera access.",
      "Press Try again.",
    ],
  };
}

export function PermissionSetup({ onReady }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [level, setLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const attachPreview = useCallback((stream: MediaStream) => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    if (!stream.getAudioTracks().length) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = ((buf[i] ?? 128) - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 6));
        raf = requestAnimationFrame(tick);
      };
      tick();
      cleanupRef.current = () => {
        cancelAnimationFrame(raf);
        source.disconnect();
        void ctx.close().catch(() => {});
      };
    } catch {
      /* level meter is optional */
    }
  }, []);

  const request = useCallback(async () => {
    setStatus("requesting");
    setFailure(null);
    cleanupRef.current?.();
    cleanupRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("unsupported", "NotSupportedError");
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 360 },
          audio: true,
        });
      } catch (err) {
        if ((err as DOMException)?.name === "NotAllowedError") throw err;
        // Retry audio-only so a missing/blocked webcam doesn't kill the interview.
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;
      setHasVideo(stream.getVideoTracks().length > 0);
      setHasAudio(stream.getAudioTracks().length > 0);
      setStatus("granted");
      attachPreview(stream);
    } catch (err) {
      setFailure(describeError(err));
      setStatus((err as DOMException)?.name === "NotAllowedError" ? "denied" : "error");
    }
  }, [attachPreview]);

  const handedOffRef = useRef(false);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      if (streamRef.current && !handedOffRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);



  const start = () => {
    handedOffRef.current = true;
    cleanupRef.current?.();
    onReady(streamRef.current);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-border/60">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Set up camera & microphone</h1>
              <p className="text-sm text-muted-foreground">
                This is a live video interview. Grant access so the interviewer can hear you and
                your answers can be transcribed.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-muted/40">
              {status === "granted" && hasVideo ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full scale-x-[-1] object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Camera className="h-6 w-6" />
                  {status === "granted" ? "No camera detected" : "Camera preview"}
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center gap-4 rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4" /> Camera
                </span>
                <Badge variant={status === "granted" && hasVideo ? "default" : "secondary"}>
                  {status === "granted" ? (hasVideo ? "Ready" : "Not found") : "Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm">
                  <Mic className="h-4 w-4" /> Microphone
                </span>
                <Badge variant={status === "granted" && hasAudio ? "default" : "secondary"}>
                  {status === "granted" ? (hasAudio ? "Ready" : "Not found") : "Pending"}
                </Badge>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  {status === "granted" && hasAudio ? "Say something to test your mic" : "Mic level"}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary transition-[width] duration-100"
                    style={{ width: `${Math.round(level * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {status === "granted" && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {hasVideo && hasAudio
                ? "All set — you're ready to start the interview."
                : hasAudio
                  ? "Microphone ready. You can continue without a camera."
                  : "Devices limited — you can still answer by typing."}
            </div>
          )}

          {failure && (
            <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium">{failure.title}</p>
                  <p className="text-sm text-muted-foreground">{failure.detail}</p>
                </div>
              </div>
              <ol className="ml-6 list-decimal space-y-1 text-sm text-muted-foreground">
                {failure.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {status !== "granted" ? (
              <Button onClick={() => void request()} disabled={status === "requesting"} className="gap-2">
                {status === "requesting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : failure ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {status === "requesting"
                  ? "Waiting for permission…"
                  : failure
                    ? "Try again"
                    : "Allow camera & microphone"}
              </Button>
            ) : (
              <>
                <Button onClick={start}>Start interview</Button>
                <Button variant="outline" onClick={() => void request()} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Re-test devices
                </Button>
              </>
            )}
            {status !== "granted" && (
              <Button variant="ghost" onClick={start}>
                Continue with text only
              </Button>
            )}
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="help" className="border-border/60">
              <AccordionTrigger className="text-sm">
                Permission popup didn't appear or nothing works?
              </AccordionTrigger>
              <AccordionContent>
                <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Look for a blocked-camera icon at the right of the address bar and allow it.</li>
                  <li>Chrome: Settings → Privacy and security → Site settings → Camera / Microphone.</li>
                  <li>Safari: Safari → Settings → Websites → Camera / Microphone → Allow.</li>
                  <li>Windows: Settings → Privacy → Camera / Microphone → allow desktop apps.</li>
                  <li>macOS: System Settings → Privacy & Security → Camera / Microphone → enable your browser.</li>
                  <li>Close other meeting apps, then reload this page.</li>
                  <li>Still stuck? Continue with text only — the interview works fully by typing.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
