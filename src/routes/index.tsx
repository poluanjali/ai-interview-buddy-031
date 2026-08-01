import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mic, FileText, BarChart3, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MockMate — AI Placement Interview Practice" },
      { name: "description", content: "Practice real placement interviews with an adaptive AI interviewer. Get instant feedback, scores, and a report card." },
      { property: "og:title", content: "MockMate — AI Placement Interview Practice" },
      { property: "og:description", content: "Practice real placement interviews with an adaptive AI interviewer." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              M
            </div>
            <span className="text-xl font-semibold tracking-tight">MockMate</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#interview-types" className="text-muted-foreground hover:text-foreground transition-colors">Interview types</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl text-center">
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-sm">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Built for campus placement prep
            </Badge>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Practice interviews that feel{" "}
              <span className="text-primary">real</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              MockMate simulates HR, technical, and DSA rounds with an adaptive AI interviewer. Get scored on clarity, confidence, and accuracy — then receive a detailed report card.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Start free practice
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline">
                  See how it works
                </Button>
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight">Everything you need to crack placements</h2>
              <p className="mt-3 text-muted-foreground">From first-round HR to final technical deep dives.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Adaptive AI questions</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Follow-up questions react to your answers, just like a real interviewer.</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mic className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Voice & text mode</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Answer by speaking or typing. Build comfort for online assessments.</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Resume-aware interviews</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Paste your resume and the AI asks about your projects and skills.</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Detailed report card</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Scores, strengths, weaknesses, and resources to improve.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-muted/30 px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">How it works</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { step: "01", title: "Set your target", desc: "Pick a role, company, difficulty, and topics. Upload your resume text for personalized questions." },
                { step: "02", title: "Start the interview", desc: "Meet Alex or Aria. Answer questions in text or voice while the AI adapts in real time." },
                { step: "03", title: "Review your report", desc: "Get a breakdown of technical, communication, and confidence scores with improvement tips." },
              ].map((item) => (
                <div key={item.step} className="relative rounded-2xl border border-border bg-card p-6">
                  <span className="text-4xl font-bold text-primary/20">{item.step}</span>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="interview-types" className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">Interview types students love</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Quick practice", desc: "10-minute warm-up rounds for any topic.", topics: ["Aptitude", "Communication", "HR screening"] },
                { title: "Full mock", desc: "Multi-stage simulation covering HR, technical, and DSA.", topics: ["HR", "Technical", "DSA", "System design"] },
                { title: "Company-specific", desc: "Practice for the style of top recruiters.", topics: ["TCS", "Infosys", "Wipro", "Google"] },
              ].map((card) => (
                <Card key={card.title} className="overflow-hidden">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold">{card.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{card.desc}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {card.topics.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold tracking-tight">Ready to ace your next interview?</h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">Join thousands of students practicing smarter with MockMate.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="gap-2">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Unlimited practice</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Instant feedback</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Progress tracking</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">M</div>
            <span className="font-semibold">MockMate</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} MockMate. Built for student placement success.</p>
        </div>
      </footer>
    </div>
  );
}
