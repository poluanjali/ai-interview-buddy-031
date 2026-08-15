import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInterview, submitAnswer, endInterview } from "@/lib/interview.functions";
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
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.interview_messages]);

  const messages = data?.interview_messages ?? [];
  const interview = data;

  const appendMessages = (newMessages: any[]) => {
    queryClient.setQueryData(["interview", id], (prev: any) =>
      prev
        ? { ...prev, interview_messages: [...(prev.interview_messages ?? []), ...newMessages] }
        : prev,
    );
  };

  const handleSubmit = async () => {
    if (!answer.trim() || isSubmitting) return;
    const text = answer.trim();
    setIsSubmitting(true);
    setAnswer("");
    // Show the answer immediately instead of waiting for a refetch round-trip.
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

  const handleEnd = async () => {
    if (isEnding) return;
    setIsEnding(true);
    try {
      const result = await end({ data: { interviewId: id } });
      toast.success("Interview complete! Generating report...");
      navigate({ to: "/report/$id", params: { id: result.reportId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end interview");
      setIsEnding(false);
    }
  };

  const toggleVoice = () => {
    if (!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    if (isListening) {
      (window as any).recognition?.stop();
      setIsListening(false);
      return;
    }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAnswer((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onerror = () => toast.error("Voice recognition failed. Try again.");
    recognition.onend = () => setIsListening(false);
    (window as any).recognition = recognition;
    recognition.start();
    setIsListening(true);
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

      <ScrollArea className="h-[55vh] rounded-xl border border-border/60 bg-card p-4">
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
              placeholder="Type your answer here..."
              className="min-h-[120px] resize-none pr-12"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) handleSubmit();
              }}
            />
            <Button
              size="icon"
              variant={isListening ? "destructive" : "ghost"}
              className="absolute right-2 top-2"
              onClick={toggleVoice}
              disabled={isSubmitting}
            >
              {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
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
