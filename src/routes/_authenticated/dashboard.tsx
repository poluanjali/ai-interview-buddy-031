import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createInterview, getDashboardData } from "@/lib/interview.functions";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Play, FileText, Trophy, TrendingUp, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MockMate" },
      { name: "description", content: "Track your interview practice progress and start new mock interviews." },
    ],
  }),
  component: DashboardPage,
});

const companyOptions = ["TCS", "Infosys", "Wipro", "Accenture", "Google", "Microsoft", "Amazon", "Other"];
const topicOptions = ["HR", "Technical", "DSA", "System Design", "Aptitude", "Communication", "Resume"];

function DashboardPage() {
  const navigate = useNavigate();
  const fetchDashboard = useServerFn(getDashboardData);
  const startInterview = useServerFn(createInterview);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Placement practice session");
  const [mode, setMode] = useState<"quick" | "full" | "company" | "custom">("quick");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [topics, setTopics] = useState<string[]>(["HR"]);
  const [resumeText, setResumeText] = useState("");
  const [creating, setCreating] = useState(false);

  const toggleTopic = (topic: string) => {
    setTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
  };

  const handleCreate = async () => {
    if (topics.length === 0) {
      toast.error("Pick at least one topic.");
      return;
    }
    const sessionTitle = title.trim() || `${topics[0]} practice session`;
    setCreating(true);
    try {
      const result = await startInterview({
        data: {
          mode,
          title: sessionTitle,
          difficulty,
          settings: {
            topics,
            company: company || undefined,
            role: role || undefined,
            resumeText: resumeText || undefined,
          },
        },
      });
      toast.success("Interview started!");
      setOpen(false);
      refetch();
      navigate({ to: "/interview/$id", params: { id: result.interviewId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start interview");
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const completed = data?.interviews?.filter((i) => i.status === "complete") ?? [];
  const averageScore = completed.length
    ? Math.round(completed.reduce((sum, i) => sum + (i.overall_score ?? 0), 0) / completed.length)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your dashboard</h1>
          <p className="text-muted-foreground">Track progress and start your next mock interview.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Configure your interview</DialogTitle>
              <DialogDescription>Pick the focus, company, and difficulty to personalize the session.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Session title</Label>
                <Input id="title" placeholder="e.g. TCS HR + Technical round" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">Quick practice</SelectItem>
                      <SelectItem value="full">Full mock</SelectItem>
                      <SelectItem value="company">Company-specific</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Select value={company} onValueChange={setCompany}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {companyOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Target role</Label>
                  <Input id="role" placeholder="e.g. Software Engineer" value={role} onChange={(e) => setRole(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Topics</Label>
                <div className="flex flex-wrap gap-2">
                  {topicOptions.map((t) => (
                    <Badge
                      key={t}
                      variant={topics.includes(t) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTopic(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Resume (optional)</Label>
                <ResumeUpload
                  onParsed={({ profile, resumeText: text }) => {
                    setResumeText(text);
                    const matched = profile.suggestedTopics
                      .map((s) => topicOptions.find((t) => t.toLowerCase() === s.toLowerCase()))
                      .filter((t): t is string => Boolean(t));
                    setTopics((prev) => Array.from(new Set([...prev, "Resume", ...matched])));
                  }}
                  onCleared={() => setResumeText("")}
                />
                <Textarea id="resume" placeholder="Or paste key projects, skills, and achievements..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={4} />
              </div>

              <Button className="w-full" onClick={handleCreate} disabled={creating || topics.length === 0}>
                {creating ? "Starting..." : "Start interview"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground"><Trophy className="h-4 w-4" /> Average score</div>
            <div className="mt-2 text-3xl font-bold">{averageScore || "—"}</div>
            <p className="text-xs text-muted-foreground">Across {completed.length} completed interviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground"><Play className="h-4 w-4" /> Interviews</div>
            <div className="mt-2 text-3xl font-bold">{data?.interviews?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total started</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4" /> Completed</div>
            <div className="mt-2 text-3xl font-bold">{completed.length}</div>
            <p className="text-xs text-muted-foreground">Finished with report</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-4 w-4" /> Topics practiced</div>
            <div className="mt-2 text-3xl font-bold">{data?.progress?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Tracked skill areas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Recent interviews</h2>
          {data?.interviews?.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No interviews yet. Start your first practice session!</p>
            </Card>
          )}
          {data?.interviews?.map((interview) => (
            <Card key={interview.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{interview.title}</h3>
                      <Badge variant={interview.status === "complete" ? "default" : "secondary"}>{interview.status}</Badge>
                      <Badge variant="outline">{interview.difficulty}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(interview.started_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {interview.mode}</span>
                      {interview.overall_score !== null && <span className="flex items-center gap-1"><Trophy className="h-3 w-3" /> {interview.overall_score}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {interview.status === "complete" ? (
                      <Link to="/report/$id" params={{ id: interview.id }}>
                        <Button variant="outline" size="sm">View report</Button>
                      </Link>
                    ) : (
                      <Link to="/interview/$id" params={{ id: interview.id }}>
                        <Button size="sm">Continue</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Skill progress</h2>
          {data?.progress?.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Complete interviews to see your skill scores.</p>
            </Card>
          )}
          {data?.progress?.map((p) => (
            <Card key={p.topic}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.topic}</span>
                  <span className="text-sm text-muted-foreground">{p.total_attempts} attempts</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={p.average_score ?? 0} className="flex-1" />
                  <span className="text-sm font-semibold">{p.average_score ?? 0}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
