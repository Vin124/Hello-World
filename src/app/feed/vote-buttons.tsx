"use client";

import { useOptimistic, useTransition } from "react";
import { vote } from "../votes/actions";

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

  const arrow =
    "grid h-7 w-7 place-items-center rounded-full text-xs transition-all duration-300 ease-[var(--spring)] hover:scale-110 active:scale-90";
  return (
    <div className="clay-sm flex shrink-0 flex-col items-center gap-0.5 px-1 py-1.5">
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={state.myVote === 1}
        onClick={() => onVote(1)}
        className={`${arrow} ${state.myVote === 1 ? "bg-up text-white shadow-md" : "text-muted"}`}
      >
        <span key={String(state.myVote === 1)} className={state.myVote === 1 ? "pop" : ""}>▲</span>
      </button>
      <span
        key={state.score}
        className="pop min-w-6 text-center text-sm font-black tabular-nums"
      >
        {state.score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={state.myVote === -1}
        onClick={() => onVote(-1)}
        className={`${arrow} ${state.myVote === -1 ? "bg-down text-white shadow-md" : "text-muted"}`}
      >
        <span key={String(state.myVote === -1)} className={state.myVote === -1 ? "pop" : ""}>▼</span>
      </button>
    </div>
  );
}
