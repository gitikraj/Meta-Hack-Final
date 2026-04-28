"use client";

import { ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function BackBtn() {
  const { navigate } = useApp();
  return (
    <button
      onClick={() => navigate("dashboard")}
      className="inline-flex items-center gap-1.5 mb-5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors font-code bg-transparent border-none cursor-pointer p-0"
    >
      <ArrowLeft className="h-3 w-3" /> Dashboard
    </button>
  );
}
