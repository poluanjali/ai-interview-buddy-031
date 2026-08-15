import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Sparkles, Volume2, VolumeX } from "lucide-react";

type Props = {
  stream: MediaStream | null;
  cameraOn: boolean;
  onToggleCamera: () => void;
  aiSpeaking: boolean;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  micLevel: number;
  candidateName?: string;
};

export function VideoStage({
  stream,
  cameraOn,
  onToggleCamera,
  aiSpeaking,
  voiceEnabled,
  onToggleVoice,
  micLevel,
  candidateName = "You",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Interviewer */}
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-muted/40">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform duration-300 ${
              aiSpeaking ? "scale-110 ring-4 ring-primary/40 animate-pulse" : ""
            }`}
          >
            <Sparkles className="h-10 w-10" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          <Badge variant="secondary">AI Interviewer</Badge>
          {aiSpeaking && <Badge>Speaking…</Badge>}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2"
          onClick={onToggleVoice}
          aria-label={voiceEnabled ? "Mute interviewer" : "Unmute interviewer"}
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>

      {/* Candidate */}
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-muted/40">
        {cameraOn && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full scale-x-[-1] object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Camera off
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          <Badge variant="secondary">{candidateName}</Badge>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-primary transition-[width] duration-100"
              style={{ width: `${Math.round(micLevel * 100)}%` }}
            />
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2"
          onClick={onToggleCamera}
          aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
        >
          {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
