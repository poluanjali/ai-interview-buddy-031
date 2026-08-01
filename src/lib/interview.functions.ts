import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  CreateInterviewInputSchema,
  SubmitAnswerInputSchema,
  EndInterviewInputSchema,
  InterviewMessageSchema,
  type InterviewStage,
} from "@/lib/interview.schemas";
import type { Database } from "@/integrations/supabase/types";

const INTERVIEW_MODEL = "google/gemini-3.6-flash";
const REPORT_MODEL = "openai/gpt-5.5";

type Json = Database["public"]["Tables"]["interviews"]["Row"]["settings"];

function getProvider() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

function baseSystemPrompt(settings: {
  role?: string | undefined;
  company?: string | undefined;
  difficulty: string;
  topics: string[];
  resumeText?: string | undefined;
  voice: "male" | "female";
}) {
  const name = settings.voice === "female" ? "Aria" : "Alex";
  return `You are ${name}, a professional placement interviewer for Indian college students. You are conducting a realistic ${settings.difficulty} interview${settings.company ? ` for ${settings.company}` : ""}${settings.role ? ` in the role of ${settings.role}` : ""}.

Focus areas: ${settings.topics.length ? settings.topics.join(", ") : "general placement preparation"}.
${settings.resumeText ? `The candidate has provided this resume/project summary: ${settings.resumeText}` : ""}

Rules:
- Be concise but warm. Ask only one question at a time.
- Adapt follow-up questions based on the candidate's previous answers.
- For technical questions, prefer conceptual explanation over code (no compiler needed).
- Keep questions appropriate for a campus placement interview.
- If the answer is weak, ask a simpler probing question; if strong, increase depth slightly.
- Never answer for the candidate. Never give long explanations before the candidate responds.
- Use a professional, encouraging tone.`;
}

export const createInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CreateInterviewInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();

    const candidateName = profile?.full_name ?? "Candidate";
    const settings = data.settings;
    const firstStage: InterviewStage = "introduction";

    const { output } = await generateText({
      model: getProvider()(INTERVIEW_MODEL),
      system: baseSystemPrompt({ ...settings, difficulty: data.difficulty }),
      output: Output.object({
        schema: z.object({
          stage: z.enum(["introduction", "hr", "technical", "resume", "behavioral", "system_design", "closing"]),
          question: z.string(),
          greeting: z.string().optional(),
        }),
      }),
      prompt: `Start a ${data.mode} interview for ${candidateName}. Generate a brief greeting and the first question. The stage should be "${firstStage}".`,
    });

    const { data: interview, error } = await supabase
      .from("interviews")
      .insert({
        user_id: userId,
        mode: data.mode,
        title: data.title,
        difficulty: data.difficulty,
        role: settings.role ?? null,
        company: settings.company ?? null,
        topics: settings.topics,
        settings: settings as Json,
        current_stage: firstStage,
        status: "in_progress",
      })
      .select()
      .single();

    if (error || !interview) throw new Error(error?.message ?? "Failed to create interview");

    const greeting = output.greeting ?? `Hello ${candidateName}! I'm ${settings.voice === "female" ? "Aria" : "Alex"}, your interviewer today. Let's begin.`;
    const question = output.question;

    await supabase.from("interview_messages").insert([
      { interview_id: interview.id, role: "ai", content: greeting, stage: firstStage },
      { interview_id: interview.id, role: "ai", content: question, stage: firstStage },
    ]);

    return { interviewId: interview.id, greeting, question, stage: firstStage };
  });

export const submitAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SubmitAnswerInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select("*, interview_messages(*)")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();

    if (interviewError || !interview) throw new Error("Interview not found");
    if (interview.status === "complete") throw new Error("Interview is already complete");

    const messages = InterviewMessageSchema.array().parse(
      interview.interview_messages
    );
    messages.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

    await supabase.from("interview_messages").insert({
      interview_id: interview.id,
      role: "user",
      content: data.answer,
      stage: interview.current_stage,
    });

    const settings = interview.settings as {
      topics?: string[];
      company?: string;
      role?: string;
      resumeText?: string;
      voice?: "male" | "female";
    };

    const history = messages
      .slice(-6)
      .map((m) => `${m.role === "ai" ? "Interviewer" : "Candidate"}: ${m.content}`)
      .join("\n");

    const { output } = await generateText({
      model: getProvider()(INTERVIEW_MODEL),
      system: baseSystemPrompt({
        difficulty: interview.difficulty,
        topics: settings.topics ?? [],
        company: settings.company,
        role: settings.role,
        resumeText: settings.resumeText,
        voice: settings.voice ?? "male",
      }),
      output: Output.object({
        schema: z.object({
          stage: z.enum(["introduction", "hr", "technical", "resume", "behavioral", "system_design", "closing", "complete"]),
          question: z.string(),
          scores: z.object({
            technicalAccuracy: z.number().int().min(1).max(10),
            communicationClarity: z.number().int().min(1).max(10),
            confidenceStructure: z.number().int().min(1).max(10),
            overall: z.number().int().min(1).max(10),
          }),
          explanation: z.string(),
          isFinal: z.boolean(),
        }),
      }),
      prompt: `Recent conversation:\n${history}\n\nCandidate just answered: "${data.answer}"\n\nEvaluate the answer and provide the next question. If this is the 8th exchange or more, or if you have covered enough topics, set isFinal to true and provide a closing question or thank-you message.`,
    });

    await supabase.from("interview_messages").insert({
      interview_id: interview.id,
      role: "ai",
      content: output.question,
      stage: output.stage,
      scores: output.scores as Json,
    });

    await supabase
      .from("interviews")
      .update({ current_stage: output.stage })
      .eq("id", interview.id);

    return { ...output, interviewId: interview.id, isFinal: output.isFinal };
  });

export const endInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => EndInterviewInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select("*, interview_messages(*)")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();

    if (interviewError || !interview) throw new Error("Interview not found");

    const messages = InterviewMessageSchema.array().parse(interview.interview_messages);
    messages.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

    const transcript = messages.map((m) => `${m.role === "ai" ? "Interviewer" : "Candidate"}: ${m.content}`).join("\n");

    const { output } = await generateText({
      model: getProvider()(REPORT_MODEL),
      system: `You are an expert interview coach evaluating a campus placement mock interview. Provide a fair, detailed report in the requested JSON schema. Be honest but encouraging.`,
      output: Output.object({
        schema: z.object({
          overallScore: z.number().int().min(1).max(100),
          categoryScores: z.record(z.number().int().min(1).max(100)),
          strengths: z.array(z.string()),
          weaknesses: z.array(z.string()),
          summary: z.string(),
          recommendedResources: z.array(z.string()),
          sampleAnswers: z.record(z.string()),
        }),
      }),
      prompt: `Interview transcript:\n${transcript}\n\nGenerate a final report. categoryScores should include keys such as Technical Knowledge, Communication, Confidence/Structure, and Overall Fit. sampleAnswers should map 2-3 question stages to a model concise answer.`,
    });

    const overallScore = output.overallScore;

    const { data: report, error: reportError } = await supabase
      .from("interview_reports")
      .insert({
        interview_id: interview.id,
        overall_score: overallScore,
        category_scores: output.categoryScores as Json,
        strengths: output.strengths,
        weaknesses: output.weaknesses,
        summary: output.summary,
        recommended_resources: output.recommendedResources,
        sample_answers: output.sampleAnswers as Json,
      })
      .select()
      .single();

    if (reportError) throw new Error(reportError.message);

    await supabase
      .from("interviews")
      .update({ status: "complete", overall_score: overallScore, ended_at: new Date().toISOString() })
      .eq("id", interview.id);

    for (const topic of interview.topics ?? []) {
      const topicMessages = messages.filter((m) => m.role === "user" && m.stage === topic);
      const avgScore =
        topicMessages.length > 0
          ? Math.round(
              topicMessages.reduce((sum, m) => sum + (m.scores?.["overall"] ?? 0), 0) / topicMessages.length
            ) * 10
          : overallScore;

      const { data: existing } = await supabase
        .from("user_progress")
        .select("total_attempts, average_score")
        .eq("user_id", userId)
        .eq("topic", topic)
        .single();

      const totalAttempts = (existing?.total_attempts ?? 0) + 1;
      const newAverage = existing?.average_score
        ? Math.round((existing.average_score * (totalAttempts - 1) + avgScore) / totalAttempts)
        : avgScore;

      await supabase.from("user_progress").upsert(
        {
          user_id: userId,
          topic,
          total_attempts: totalAttempts,
          average_score: newAverage,
          last_attempt_at: new Date().toISOString(),
        },
        { onConflict: "user_id, topic" }
      );
    }

    return { reportId: report.id, ...output };
  });

export const getInterview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.string().uuid().parse(input))
  .handler(async ({ data: interviewId, context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("interviews")
      .select("*, interview_messages(*), interview_reports(*)")
      .eq("id", interviewId)
      .eq("user_id", userId)
      .single();

    if (error || !data) throw new Error("Interview not found");
    return data;
  });

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: interviews } = await supabase
      .from("interviews")
      .select("id, title, mode, status, difficulty, overall_score, started_at, ended_at, current_stage")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(20);

    const { data: progress } = await supabase
      .from("user_progress")
      .select("topic, total_attempts, average_score, last_attempt_at")
      .eq("user_id", userId)
      .order("last_attempt_at", { ascending: false });

    return { interviews: interviews ?? [], progress: progress ?? [] };
  });
