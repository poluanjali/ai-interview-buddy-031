import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ParseResumeInputSchema = z.object({
  filename: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(200),
  // base64 data URL or raw base64 of the uploaded file
  fileData: z.string().min(10).max(12_000_000),
});

const ResumeProfileSchema = z.object({
  name: z.string(),
  headline: z.string(),
  skills: z.array(z.string()),
  projects: z.array(z.object({ name: z.string(), description: z.string() })),
  experience: z.array(z.string()),
  education: z.array(z.string()),
  summary: z.string(),
  suggestedTopics: z.array(z.string()),
});

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;

const RESUME_MODEL = "google/gemini-3.6-flash";

export const parseResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ParseResumeInputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const base64 = data.fileData.includes("base64,")
      ? data.fileData.split("base64,")[1]!
      : data.fileData;
    if (!base64) throw new Error("The uploaded file appears to be empty.");

    const isPdf = data.mimeType.includes("pdf");
    const content: unknown[] = [
      {
        type: "text",
        text: "Extract this candidate's resume into the requested JSON structure. suggestedTopics should be 3-6 interview focus areas drawn from their actual skills and projects. Keep descriptions short (max 25 words).",
      },
    ];

    if (isPdf) {
      content.push({
        type: "file",
        file: {
          filename: data.filename,
          file_data: `data:${data.mimeType};base64,${base64}`,
        },
      });
    } else {
      // Plain text / markdown resumes: decode and send as text
      let text = "";
      try {
        text = new TextDecoder().decode(
          Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
        );
      } catch {
        throw new Error("Unsupported file. Please upload a PDF or a plain text resume.");
      }
      if (!text.trim()) throw new Error("The uploaded file appears to be empty.");
      content.push({ type: "text", text: text.slice(0, 40_000) });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        model: RESUME_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a resume parser for a placement interview platform. Return only JSON matching the schema. If a field is missing in the resume, return an empty string or empty array.",
          },
          { role: "user", content },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "resume_profile",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "name",
                "headline",
                "skills",
                "projects",
                "experience",
                "education",
                "summary",
                "suggestedTopics",
              ],
              properties: {
                name: { type: "string" },
                headline: { type: "string" },
                skills: { type: "array", items: { type: "string" } },
                projects: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "description"],
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                    },
                  },
                },
                experience: { type: "array", items: { type: "string" } },
                education: { type: "array", items: { type: "string" } },
                summary: { type: "string" },
                suggestedTopics: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please top up to continue.");
      throw new Error(`Resume parsing failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Could not read the resume. Try another file.");

    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end <= start) throw new Error("Could not read the resume. Try another file.");
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    }

    const profile = ResumeProfileSchema.parse(parsed);

    const resumeText = [
      profile.headline && `Headline: ${profile.headline}`,
      profile.summary && `Summary: ${profile.summary}`,
      profile.skills.length ? `Skills: ${profile.skills.join(", ")}` : "",
      profile.projects.length
        ? `Projects:\n${profile.projects.map((p) => `- ${p.name}: ${p.description}`).join("\n")}`
        : "",
      profile.experience.length ? `Experience:\n${profile.experience.map((e) => `- ${e}`).join("\n")}` : "",
      profile.education.length ? `Education:\n${profile.education.map((e) => `- ${e}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return { profile, resumeText };
  });
