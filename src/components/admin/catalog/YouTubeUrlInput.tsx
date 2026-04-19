import { useMemo } from "react";
import { Youtube, ExternalLink, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}

const YT_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/.+/i;

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lightweight YouTube URL input with format validation and a thumbnail preview.
 * Empty value = no video. Invalid URL = warning shown but value still saved.
 */
export function YouTubeUrlInput({
  value,
  onChange,
  label = "Vídeo explicativo (YouTube)",
  placeholder = "https://www.youtube.com/watch?v=...",
}: Props) {
  const trimmed = value?.trim() ?? "";
  const isValid = useMemo(() => trimmed === "" || YT_REGEX.test(trimmed), [trimmed]);
  const ytId = useMemo(() => extractYouTubeId(trimmed), [trimmed]);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm flex items-center gap-1.5">
        <Youtube className="h-3.5 w-3.5 text-destructive" /> {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(!isValid && "border-destructive/60 focus-visible:ring-destructive/40")}
        type="url"
      />
      {!isValid && (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> URL não parece ser do YouTube.
        </p>
      )}
      {ytId && (
        <div className="flex items-center gap-2 pt-1">
          <img
            src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
            alt="Pré-visualização do vídeo"
            className="h-12 w-20 rounded object-cover border"
            loading="lazy"
          />
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline"
          >
            Abrir <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
