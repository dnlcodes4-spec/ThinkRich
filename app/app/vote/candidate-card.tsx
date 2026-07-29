type Candidate = {
  full_name: string;
  party: string | null;
  running_mate: string | null;
  running_mate_title: string | null;
  slogan: string | null;
  photoUrl: string | null;
  endorsed: boolean;
};

// Presentational candidate card. `endorsed` marks the movement's own pick where
// more than one candidate has been added for the same seat.
export function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <div
      className={
        candidate.endorsed
          ? "rounded-card border border-accent/40 bg-surface p-5 shadow-sm"
          : "rounded-card border border-border bg-surface p-5"
      }
    >
      {candidate.endorsed ? (
        <p className="mb-3 text-xs font-semibold text-accent">Our candidate</p>
      ) : null}

      <div className="flex gap-4">
        <div className="aspect-3/4 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
          {candidate.photoUrl ? (
            // Public campaign image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.photoUrl} alt={candidate.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">No photo</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-foreground">{candidate.full_name}</p>
          {candidate.party ? <p className="mt-0.5 text-sm text-muted">{candidate.party}</p> : null}
          {candidate.running_mate ? (
            <p className="mt-2 text-sm text-foreground">
              <span className="text-muted">{candidate.running_mate_title ?? "Running mate"}: </span>
              {candidate.running_mate}
            </p>
          ) : null}
          {candidate.slogan ? <p className="mt-2 text-sm italic text-muted">“{candidate.slogan}”</p> : null}
        </div>
      </div>
    </div>
  );
}
