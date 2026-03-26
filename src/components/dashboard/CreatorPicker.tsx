"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { Creator } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";

interface CreatorPickerProps {
  creators: Creator[];
  value: string;
  onChange: (creatorId: string) => void;
}

export function CreatorPicker({
  creators,
  value,
  onChange,
}: CreatorPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = creators.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-left text-sm text-foreground outline-none transition",
            "hover:border-neon-cyan/35 focus:border-neon-cyan/60 focus:ring-2 focus:ring-neon-cyan/25",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (
              <>
                <CreatorAvatarThumb
                  name={selected.name}
                  avatarUrl={selected.avatarUrl}
                  size={28}
                  frameClassName="h-7 w-7 border-neon-cyan/25"
                />
                <span className="truncate">{selected.name}</span>
              </>
            ) : (
              <span className="truncate text-muted">Select creator…</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command className="rounded-xl border border-white/10 bg-panel/95 text-foreground">
          <CommandInput
            placeholder="Search creators…"
            className="h-10 border-b border-white/10 bg-transparent px-3 text-sm outline-none"
          />
          <CommandList className="max-h-64 overflow-auto p-1">
            <CommandEmpty className="px-3 py-2 text-sm text-muted">
              No creator found.
            </CommandEmpty>
            <CommandGroup>
              {creators.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.handleTikTok}`}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm aria-selected:bg-neon-cyan/10"
                >
                  <CreatorAvatarThumb
                    name={c.name}
                    avatarUrl={c.avatarUrl}
                    size={32}
                    frameClassName="h-8 w-8 border-white/10"
                  />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {value === c.id ? (
                    <Check className="h-4 w-4 text-neon-cyan" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CreatorAvatarThumb({
  name,
  avatarUrl,
  size,
  frameClassName,
}: {
  name: string;
  avatarUrl: string;
  size: number;
  frameClassName: string;
}) {
  const src = (avatarUrl ?? "").trim();
  const hasAvatar = src.length > 0;
  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border",
        frameClassName,
      )}
    >
      {hasAvatar ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="object-cover"
          unoptimized
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 text-[10px] font-bold text-foreground/80"
          aria-hidden
        >
          {(name.trim().slice(0, 1) || "?").toUpperCase()}
        </span>
      )}
    </span>
  );
}
