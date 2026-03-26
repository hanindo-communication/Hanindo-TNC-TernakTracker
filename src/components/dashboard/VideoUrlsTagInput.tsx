"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

function parseToTags(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function serializeTags(tags: string[]): string {
  return tags.join("\n");
}

function splitPastedUrls(text: string): string[] {
  return text
    .split(/[\n,\s]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

interface VideoUrlsTagInputProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function VideoUrlsTagInput({
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: VideoUrlsTagInputProps) {
  const tags = parseToTags(value);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!value) setDraft("");
  }, [value]);

  const commitTags = (nextTags: string[]) => {
    onChange(serializeTags(nextTags));
  };

  const commitDraft = () => {
    const t = draft.trim();
    if (!t) return;
    commitTags([...tags, t]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
      return;
    }

    if (e.key === " ") {
      if (draft.trim()) {
        e.preventDefault();
        commitDraft();
      }
      return;
    }

    if (e.key === "Backspace" && !draft && tags.length > 0) {
      e.preventDefault();
      commitTags(tags.slice(0, -1));
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const text = e.clipboardData.getData("text");
    if (!text || !text.trim()) return;

    const parts = splitPastedUrls(text);
    const multi =
      parts.length > 1 ||
      /[\n,]/.test(text) ||
      /\s+https?:\/\//i.test(text.trim());

    if (multi) {
      e.preventDefault();
      const next = [...tags, ...parts];
      commitTags(next);
      setDraft("");
    }
  };

  const removeTag = (idx: number) => {
    if (disabled) return;
    commitTags(tags.filter((_, i) => i !== idx));
  };

  const focusInputRef = useRef<HTMLInputElement>(null);
  const focusInput = () => {
    if (!disabled) focusInputRef.current?.focus();
  };

  const previewCount = tags.length + (draft.trim() ? 1 : 0);
  const countLabel =
    previewCount === 0
      ? "No videos yet — add TikTok URLs below"
      : previewCount === 1
        ? "1 video will be uploaded"
        : `${previewCount} videos will be uploaded`;

  return (
    <div className="flex min-w-[260px] max-w-[340px] flex-col gap-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={focusInput}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            focusInput();
          }
        }}
        className={cn(
          "min-h-[5rem] cursor-text rounded-md border border-white/10 bg-panel p-2 transition",
          "[color-scheme:dark]",
          !disabled &&
            "focus-within:border-neon-cyan/55 focus-within:ring-1 focus-within:ring-neon-cyan/25",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <div className="flex flex-wrap content-start gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={`${i}-${tag.slice(0, 48)}`}
              className="group inline-flex max-w-full items-center gap-1 rounded-lg border border-white/12 bg-white/[0.08] py-0.5 pl-2 pr-1 text-[11px] text-foreground/95"
            >
              <span className="min-w-0 truncate" title={tag}>
                {tag}
              </span>
              {!disabled ? (
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    removeTag(i);
                  }}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition hover:bg-white/10 hover:text-foreground"
                  aria-label="Hapus URL"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <input
        ref={focusInputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        disabled={disabled}
        placeholder="Paste video URL and press Enter, comma, or space"
        aria-label={ariaLabel}
        className={cn(
          "h-9 w-full rounded-md border border-white/10 bg-panel px-2 text-xs text-foreground outline-none transition [color-scheme:dark]",
          "placeholder:text-muted/70",
          "focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25",
          disabled && "cursor-not-allowed opacity-60",
        )}
      />

      <p className="text-[11px] leading-snug text-muted">{countLabel}</p>
    </div>
  );
}
