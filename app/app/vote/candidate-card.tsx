type Candidate = {
  full_name: string;
  party: string | null;
  running_mate: string | null;
  slogan: string | null;
  photoUrl: string | null;
};

// Presentational candidate card. `hero` makes the member's most local candidate
// (their LGA) unmistakable, per the members' UX brief.
export function CandidateCard({
  office,
  where,
  candidate,
  hero = false,
}: {
  office: string;
  where: string;
  candidate: Candidate | null;
  hero?: boolean;
}) {
  return (
    <div
      className={
        hero
          ? "rounded-card border border-accent/40 bg-surface p-5 shadow-sm"
          : "rounded-card border border-border bg-surface p-5"
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-accent">{office}</p>
        <p className="text-xs text-muted">{where}</p>
      </div>

      {candidate ? (
        <div className={hero ? "mt-4 flex gap-5" : "mt-3 flex gap-4"}>
          <div
            className={
              (hero ? "w-28" : "w-20") +
              " aspect-3/4 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted"
            }
          >
            {candidate.photoUrl ? (
              // Public campaign image.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={candidate.photoUrl} alt={candidate.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted">No photo</div>
            )}
          </div>
          <div className="min-w-0">
            <p className={hero ? "font-display text-2xl font-semibold text-foreground" : "text-lg font-semibold text-foreground"}>
              {candidate.full_name}
            </p>
            {candidate.party ? <p className="mt-0.5 text-sm text-muted">{candidate.party}</p> : null}
            {candidate.running_mate ? (
              <p className="mt-2 text-sm text-foreground">
                <span className="text-muted">Running mate: </span>
                {candidate.running_mate}
              </p>
            ) : null}
            {candidate.slogan ? <p className="mt-2 text-sm italic text-muted">“{candidate.slogan}”</p> : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Not announced yet. Check back soon.</p>
      )}
    </div>
  );
}
