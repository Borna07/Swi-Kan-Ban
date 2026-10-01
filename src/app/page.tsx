"use client";

import { BoardShell } from "@/components/board/BoardShell";
import { BoardProvider } from "@/lib/store/BoardContext";

export default function Home() {
  return (
    <BoardProvider>
      <BoardShell />
    </BoardProvider>
  );
}
