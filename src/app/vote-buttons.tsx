"use client";

import { useOptimistic, useTransition } from "react";
import { vote } from "./votes/actions";

// Shows the score and the caller's vote instantly, then lets the server
// re-render with the real totals.
export function VoteButtons({
  captionId,
  score,
  myVote,
}: {
  captionId: string;
  score: number;
  myVote: 1 | -1 | 0;
}) {
  const [, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(
    { score, myVote },
    (s, value: 1 | -1) => {
      const next: 1 | -1 | 0 = s.myVote === value ? 0 : value;
      return { score: s.score - s.myVote + next, myVote: next };
    },
  );

  function onVote(value: 1 | -1) {
    startTransition(async () => {
      setOptimistic(value);
      await vote(captionId, value);
    });
  }

  const base = "rounded px-1.5 text-lg leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800";
  return (
    <div className="flex flex-col items-center text-sm">
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={state.myVote === 1}
        onClick={() => onVote(1)}
        className={`${base} ${state.myVote === 1 ? "text-orange-600" : "text-zinc-400"}`}
      >
        ▲
      </button>
      <span className="font-medium tabular-nums text-black dark:text-zinc-50">
        {state.score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={state.myVote === -1}
        onClick={() => onVote(-1)}
        className={`${base} ${state.myVote === -1 ? "text-blue-600" : "text-zinc-400"}`}
      >
        ▼
      </button>
    </div>
  );
}
