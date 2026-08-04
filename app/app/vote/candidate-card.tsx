type Candidate = {
  full_name: string;
  party: string | null;
  running_mate: string | null;
  running_mate_title: string | null;
  slogan: string | null;
  photoUrl: string | null;
  endorsed: boolean;
};

// Presentational candidate card. The endorsed one gets a gold edge and a plain
// "Backed by the movement" badge so a member can tell at a glance who the
// movement is asking them to vote for, where a seat has more than one candidate.
export function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <div
      className={
        candidate.endorsed
          ? "overflow-hidden rounded-card border border-accent/50 bg-surface shadow-sm ring-1 ring-accent/20"
          : "overflow-hidden rounded-card border border-border bg-surface"
      }
    >
      {candidate.endorsed ? (
        <p className="flex items-center gap-1.5 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent">
          <span aria-hidden="true">★</span>
          Backed by the movement
        </p>
      ) : null}

      <div className="flex gap-4 p-4 sm:p-5">
        <div className="aspect-3/4 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
          {candidate.photoUrl ? (
            // Public campaign image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.photoUrl} alt={candidate.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">No photo</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight text-foreground">{candidate.full_name}</p>
          {candidate.party ? (
            <span className="mt-1.5 inline-block rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
              {candidate.party}
            </span>
          ) : null}
          {candidate.running_mate ? (
            <p className="mt-2.5 text-sm text-foreground">
              <span className="text-muted">{candidate.running_mate_title ?? "Running mate"}: </span>
              {candidate.running_mate}
            </p>
          ) : null}
          {candidate.slogan ? (
            <p className="mt-2 text-sm italic text-muted">“{candidate.slogan}”</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
