import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getInterview } from "@/lib/interview.functions";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, RotateCcw, Loader2, CheckCircle2, XCircle, BookOpen, Lightbulb } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/report/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Interview Report — MockMate" },
      { name: "description", content: "Review your interview performance, scores, and improvement recommendations." },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const fetchInterview = useServerFn(getInterview);

  const { data, isLoading } = useQuery({
    queryKey: ["interview", id],
    queryFn: () => fetchInterview({ data: id }),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const report = data?.interview_reports?.[0];
  if (!report) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Report not found</h2>
        <Link to="/dashboard"><Button className="mt-4">Back to dashboard</Button></Link>
      </div>
    );
  }

  const categoryScores = (report.category_scores as Record<string, number> | null) ?? {};

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Dashboard</Button>
        </Link>
        <Link to="/dashboard">
          <Button size="sm" className="gap-2"><RotateCcw className="h-4 w-4" /> Practice again</Button>
        </Link>
      </div>

      <div className="rounded-3xl bg-primary px-8 py-10 text-primary-foreground">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{data?.title}</h1>
            <p className="mt-1 text-primary-foreground/80">Report card</p>
          </div>
          <div className="text-center">
            <div className="text-6xl font-bold">{report.overall_score}</div>
            <div className="text-sm text-primary-foreground/80">Overall score</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.strengths?.map((s: string) => (
                <li key={s} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /> Weaknesses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.weaknesses?.map((w: string) => (
                <li key={w} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Category scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(categoryScores).map(([category, score]) => (
              <div key={category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{category}</span>
                  <span className="text-muted-foreground">{score}/100</span>
                </div>
                <Progress value={score} className="mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{report.summary ?? ""}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Recommended resources</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.recommended_resources?.map((r: string) => (
              <li key={r} className="text-sm text-muted-foreground">{r}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {report.sample_answers && Object.keys(report.sample_answers as Record<string, string>).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sample answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(report.sample_answers as Record<string, string>).map(([question, answer]) => (
              <div key={question} className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <Badge variant="outline" className="mb-2">{question}</Badge>
                <p className="text-sm text-muted-foreground">{answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
