import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInterview, submitAnswer, endInterview } from "@/lib/interview.functions";
import { synthesizeSpeech, transcribeSpeech } from "@/lib/voice.functions";
import { VideoStage } from "@/components/interview/VideoStage";
import { PermissionSetup } from "@/components/interview/PermissionSetup";
import {
  MicRecorder,
  blobToBase64,
  playBase64Audio,
  speakWithBrowser,
  stopSpeaking,
  toSpeakableText,
} from "@/lib/speech";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mic, Send, Square, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";


export const Route = createFileRoute("/_authenticated/interview/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Interview — MockMate" },
      { name: "description", content: "Practice your mock interview with an adaptive AI interviewer." },
    ],
  }),
  component: InterviewPage,
});

function InterviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchInterview = useServerFn(getInterview);
  const submit = useServerFn(submitAnswer);
  const end = useServerFn(endInterview);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["interview", id],
    queryFn: () => fetchInterview({ data: id }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devicesReady, setDevicesReady] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  const speak = useServerFn(synthesizeSpeech);
  const transcribe = useServerFn(transcribeSpeech);
  const recorderRef = useRef<MicRecorder | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const voiceEnabledRef = useRef(true);
  voiceEnabledRef.current = voiceEnabled;
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;
  const lastSpeechRef = useRef<number>(0);
  const heardSpeechRef = useRef(false);
  const stoppingRef = useRef(false);


  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.interview_messages]);

  // Release devices and stop audio when leaving the room.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      stopSpeaking();
    };
  }, []);

  const handleDevicesReady = (s: MediaStream | null) => {
    setStream(s);
    setCameraOn((s?.getVideoTracks().length ?? 0) > 0);
    setDevicesReady(true);
  };


  const messages = data?.interview_messages ?? [];
  const interview = data;

  const speakText = useCallback(
    async (text: string) => {
      if (!voiceEnabledRef.current) return;
      const clean = toSpeakableText(text);
      if (!clean) return;
      setAiSpeaking(true);
      try {
        const res = await speak({ data: { text: clean.slice(0, 3000) } });
        if (voiceEnabledRef.current) await playBase64Audio(res.audio, res.mimeType);
      } catch {
        if (voiceEnabledRef.current) await speakWithBrowser(clean);
      } finally {
        setAiSpeaking(false);
      }
    },
    [speak],
  );

  // Read every new interviewer question aloud.
  useEffect(() => {
    if (!devicesReady) return;
    const last = [...messages].reverse().find((m: any) => m.role === "ai");
    if (!last || spokenRef.current.has(last.id)) return;
    // Only auto-speak the newest question, not history on first load.
    messages.forEach((m: any) => m.role === "ai" && spokenRef.current.add(m.id));
    if (voiceEnabled) void speakText(last.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, devicesReady]);

  const appendMessages = (newMessages: any[]) => {
    queryClient.setQueryData(["interview", id], (prev: any) =>
      prev
        ? { ...prev, interview_messages: [...(prev.interview_messages ?? []), ...newMessages] }
        : prev,
    );
  };

  const submitText = async (text: string) => {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setAnswer("");
    stopSpeaking();
    appendMessages([
      { id: `local-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() },
    ]);
    try {
      const result = await submit({ data: { interviewId: id, answer: text } });
      appendMessages([
        {
          id: `local-ai-${Date.now()}`,
          role: "ai",
          content: result.question,
          scores: result.scores,
          stage: result.stage,
          created_at: new Date().toISOString(),
        },
      ]);
      queryClient.setQueryData(["interview", id], (prev: any) =>
        prev ? { ...prev, current_stage: result.stage } : prev,
      );
    } catch (err) {
      setAnswer(text);
      toast.error(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => submitText(answer.trim());

  const handleEnd = async () => {
    if (isEnding) return;
    setIsEnding(true);
    stopSpeaking();
    try {
      const result = await end({ data: { interviewId: id } });
      toast.success("Interview complete! Generating report...");
      navigate({ to: "/report/$id", params: { id: result.reportId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end interview");
      setIsEnding(false);
    }
  };

  const SILENCE_MS = 2000;

  const handleLevel = useCallback((level: number) => {
    setMicLevel(level);
    if (level > 0.05) {
      heardSpeechRef.current = true;
      lastSpeechRef.current = Date.now();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (recorderRef.current) return;
    try {
      stopSpeaking();
      heardSpeechRef.current = false;
      lastSpeechRef.current = Date.now();
      const recorder = new MicRecorder(handleLevel);
      await recorder.start(streamRef.current ?? undefined);
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access is needed to answer by voice.");
    }
  }, [handleLevel]);

  const stopRecording = useCallback(
    async (autoSubmit = false) => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      setIsRecording(false);
      setSilenceCountdown(null);
      if (!recorder) return;
      const blob = await recorder.stop(false);
      if (!blob) {
        if (!autoSubmit) toast.error("That recording was empty — please try again.");
        return;
      }
      setIsTranscribing(true);
      try {
        const audio = await blobToBase64(blob);
        const { text } = await transcribe({ data: { audio } });
        if (!text) {
          if (!autoSubmit) toast.error("Couldn't hear anything. Please try again.");
          return;
        }
        let combined = text;
        setAnswer((prev) => {
          combined = prev ? `${prev} ${text}` : text;
          return combined;
        });
        if (autoSubmit) {
          setIsTranscribing(false);
          await submitText(combined.trim());
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Transcription failed");
      } finally {
        setIsTranscribing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transcribe],
  );

  // Auto-submit once the candidate has been silent for a moment.
  useEffect(() => {
    if (!isRecording || !autoMode) return;
    const timer = window.setInterval(() => {
      if (!heardSpeechRef.current) {
        setSilenceCountdown(null);
        return;
      }
      const quietFor = Date.now() - lastSpeechRef.current;
      setSilenceCountdown(Math.max(0, Math.ceil((SILENCE_MS - quietFor) / 1000)));
      if (quietFor >= SILENCE_MS && !stoppingRef.current) {
        stoppingRef.current = true;
        void stopRecording(true).finally(() => {
          stoppingRef.current = false;
        });
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [isRecording, autoMode, stopRecording]);

  // Start listening automatically as soon as the interviewer finishes a question.
  useEffect(() => {
    if (!autoMode || !devicesReady || aiSpeaking || isRecording || isSubmitting || isTranscribing) return;
    const t = window.setTimeout(() => void startRecording(), 500);
    return () => window.clearTimeout(t);
  }, [autoMode, devicesReady, aiSpeaking, isRecording, isSubmitting, isTranscribing, startRecording]);

  const toggleRecording = () => (isRecording ? void stopRecording(autoMode) : void startRecording());


  const toggleCamera = () => {
    const track = stream?.getVideoTracks()[0];
    if (!track) {
      toast.error("No camera available.");
      return;
    }
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  };

  const toggleInterviewerVoice = () => {
    setVoiceEnabled((prev) => {
      if (prev) stopSpeaking();
      return !prev;
    });
  };


  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Interview not found</h2>
        <Link to="/dashboard"><Button className="mt-4">Back to dashboard</Button></Link>
      </div>
    );
  }

  const isComplete = interview.status === "complete";

  if (!devicesReady && !isComplete) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
        </div>
        <PermissionSetup onReady={handleDevicesReady} />
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Dashboard</Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{interview.mode}</Badge>
          <Badge variant="outline">{interview.difficulty}</Badge>
          <Badge variant={isComplete ? "default" : "secondary"}>{isComplete ? "Complete" : "Live"}</Badge>
        </div>
      </div>

      <Card className="mb-6 overflow-hidden border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{interview.title}</h1>
              <p className="text-sm text-muted-foreground">Stage: <span className="capitalize">{interview.current_stage}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <VideoStage
          stream={stream}
          cameraOn={cameraOn}
          onToggleCamera={toggleCamera}
          aiSpeaking={aiSpeaking}
          voiceEnabled={voiceEnabled}
          onToggleVoice={toggleInterviewerVoice}
          micLevel={micLevel}
        />
      </div>

      <ScrollArea className="h-[40vh] rounded-xl border border-border/60 bg-card p-4">
        <div className="space-y-4">
          {messages.map((msg: any) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={msg.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}>
                  {msg.role === "user" ? "You" : "AI"}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.role === "ai" && (
                  <button
                    type="button"
                    onClick={() => void speakText(msg.content)}
                    className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Replay question
                  </button>
                )}
                {msg.scores && (
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-border/40 pt-2">
                    {Object.entries(msg.scores).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-xs">{k}: {String(v)}/10</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {!isComplete && (
        <div className="mt-4 rounded-xl border border-border/60 bg-card p-4">
          <div className="relative">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={isRecording ? "Listening… speak your answer" : "Speak or type your answer..."}
              className="min-h-[110px] resize-none pr-12"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) handleSubmit();
              }}
            />
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              className="absolute right-2 top-2"
              onClick={toggleRecording}
              disabled={isSubmitting || isTranscribing}
              aria-label={isRecording ? "Stop recording" : "Answer by voice"}
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {isRecording
                ? autoMode
                  ? silenceCountdown !== null
                    ? `Listening… auto-submitting in ${silenceCountdown}s if you stop speaking.`
                    : "Listening… start speaking your answer."
                  : "Recording… press stop when you finish speaking."
                : isTranscribing
                  ? "Converting your speech to text…"
                  : autoMode
                    ? "Hands-free mode: just speak — your answer is sent automatically when you pause."
                    : "Tap the mic to answer out loud — your voice becomes text automatically."}
            </p>
            <button
              type="button"
              onClick={() => {
                setAutoMode((p) => !p);
                if (isRecording) void stopRecording(false);
              }}
              className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
            >
              {autoMode ? "Switch to manual submit" : "Enable hands-free mode"}
            </button>
          </div>


          <div className="mt-3 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleEnd} disabled={isEnding || messages.length < 3}>
              {isEnding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              End interview
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !answer.trim()} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit answer
            </Button>
          </div>
        </div>
      )}

      {isComplete && (
        <div className="mt-4 text-center">
          <Link to="/report/$id" params={{ id: interview.interview_reports?.[0]?.id ?? id }}>
            <Button>View report</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
