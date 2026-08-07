import { z } from "zod";

export const InterviewModeSchema = z.enum(["quick", "full", "company", "custom"]);
export const InterviewDifficultySchema = z.enum(["easy", "medium", "hard"]);
export const InterviewStageSchema = z.enum([
  "introduction",
  "hr",
  "technical",
  "resume",
  "behavioral",
  "system_design",
  "closing",
  "complete",
]);
export const InterviewerGenderSchema = z.enum(["male", "female"]);

export const InterviewSettingsSchema = z.object({
  topics: z.array(z.string()).default([]),
  company: z.string().optional(),
  role: z.string().optional(),
  duration: z.number().int().min(5).max(120).default(30),
  voice: InterviewerGenderSchema.default("male"),
  resumeText: z.string().optional(),
});

export const CreateInterviewInputSchema = z.object({
  mode: InterviewModeSchema,
  title: z.string().min(1).max(200),
  difficulty: InterviewDifficultySchema.default("medium"),
  settings: InterviewSettingsSchema,
});

export const SubmitAnswerInputSchema = z.object({
  interviewId: z.string().uuid(),
  answer: z.string().min(1).max(10000),
});

export const EndInterviewInputSchema = z.object({
  interviewId: z.string().uuid(),
});

export const InterviewMessageSchema = z.object({
  id: z.string().uuid().optional(),
  role: z.enum(["ai", "user"]),
  content: z.string(),
  stage: InterviewStageSchema,
  scores: z
    .object({
      technicalAccuracy: z.number().int().min(1).max(10).optional(),
      communicationClarity: z.number().int().min(1).max(10).optional(),
      confidenceStructure: z.number().int().min(1).max(10).optional(),
      overall: z.number().int().min(1).max(10).optional(),
    })
    .nullish()
    .transform((v) => v ?? undefined),
  created_at: z.string().nullish().transform((v) => v ?? undefined),
});

export const NextQuestionOutputSchema = z.object({
  stage: InterviewStageSchema,
  question: z.string().min(1),
  context: z.string().optional(),
  scores: z
    .object({
      technicalAccuracy: z.number().int().min(1).max(10),
      communicationClarity: z.number().int().min(1).max(10),
      confidenceStructure: z.number().int().min(1).max(10),
      overall: z.number().int().min(1).max(10),
    })
    .optional(),
  explanation: z.string().optional(),
  isFinal: z.boolean().default(false),
});

export const FinalReportOutputSchema = z.object({
  overallScore: z.number().int().min(1).max(100),
  categoryScores: z.record(z.number().int().min(1).max(100)),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  summary: z.string(),
  recommendedResources: z.array(z.string()),
  sampleAnswers: z.record(z.string()),
});

export type InterviewMode = z.infer<typeof InterviewModeSchema>;
export type InterviewDifficulty = z.infer<typeof InterviewDifficultySchema>;
export type InterviewStage = z.infer<typeof InterviewStageSchema>;
export type InterviewerGender = z.infer<typeof InterviewerGenderSchema>;
export type InterviewSettings = z.infer<typeof InterviewSettingsSchema>;
export type CreateInterviewInput = z.infer<typeof CreateInterviewInputSchema>;
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerInputSchema>;
export type EndInterviewInput = z.infer<typeof EndInterviewInputSchema>;
export type InterviewMessage = z.infer<typeof InterviewMessageSchema>;
export type NextQuestionOutput = z.infer<typeof NextQuestionOutputSchema>;
export type FinalReportOutput = z.infer<typeof FinalReportOutputSchema>;
