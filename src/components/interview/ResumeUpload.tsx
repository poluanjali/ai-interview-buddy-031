import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileCheck2, Loader2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { parseResume, type ResumeProfile } from "@/lib/resume.functions";
import { toast } from "sonner";

type Props = {
  onParsed: (result: { profile: ResumeProfile; resumeText: string }) => void;
  onCleared: () => void;
};

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export function ResumeUpload({ onParsed, onCleared }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const runParse = useServerFn(parseResume);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [filename, setFilename] = useState("");

  const handleFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Please upload a resume smaller than 8 MB.");
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const result = await runParse({
        data: {
          filename: file.name,
          mimeType: file.type || "application/pdf",
          fileData: dataUrl,
        },
      });
      setProfile(result.profile);
      setFilename(file.name);
      onParsed(result);
      toast.success("Resume analyzed — questions will be personalized.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not analyze the resume.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setProfile(null);
    setFilename("");
    if (inputRef.current) inputRef.current.value = "";
    onCleared();
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {!profile ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">Upload your resume (PDF or text)</p>
          <p className="text-xs text-muted-foreground">
            The AI reads your skills and projects and asks personalized questions.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing resume…
              </>
            ) : (
              "Choose file"
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-medium">{filename}</span>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={clear} aria-label="Remove resume">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {profile.headline && <p className="text-xs text-muted-foreground">{profile.headline}</p>}
          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.slice(0, 12).map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          {profile.projects.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {profile.projects.length} project{profile.projects.length > 1 ? "s" : ""} detected —
              expect questions on {profile.projects.slice(0, 2).map((p) => p.name).join(", ")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
