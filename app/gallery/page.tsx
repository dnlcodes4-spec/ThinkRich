import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { RoleBadge } from "@/components/ui/badge";
import { RecordCard } from "@/components/ui/record-card";
import { DataTable, type Column } from "@/components/ui/data-table";

// Temporary internal surface: a gallery that exercises the base UI primitives
// (T-012) and verifies they render consistently. Real product screens replace this.

type Member = {
  id: string;
  name: string;
  no: string;
  ward: string;
  state: string;
  status: "active" | "frozen";
};

const members: Member[] = [
  { id: "1", name: "Ada Obi", no: "TWM-LA-IKJ-000123", ward: "Ikeja", state: "Lagos", status: "active" },
  { id: "2", name: "Chidi Eze", no: "TWM-LA-SUR-000217", ward: "Surulere", state: "Lagos", status: "frozen" },
  { id: "3", name: "Ngozi Bello", no: "TWM-LA-IKY-000342", ward: "Ikoyi", state: "Lagos", status: "active" },
];

const columns: Column<Member>[] = [
  { key: "name", header: "Member", render: (m) => <span className="font-bold">{m.name}</span> },
  { key: "no", header: "Membership no.", render: (m) => m.no, className: "font-mono" },
  { key: "loc", header: "Ward · State", render: (m) => `${m.ward} · ${m.state}`, className: "text-muted" },
  { key: "status", header: "Status", render: (m) => <StatusPill status={m.status} /> },
  { key: "actions", header: "", render: () => <Button size="sm" variant="secondary">View</Button> },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-6 px-6 py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
              UI primitives · gallery
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Think-Winners Movement
            </h1>
            <p className="mt-3 max-w-xl text-primary-foreground/80">
              The base components, built on the design tokens. Every element is
              token-driven and accessible.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
        <Section title="Brand: black + green">
          <p className="max-w-2xl text-sm text-muted">
            The ThinkRich umbrella (this app + the root site) uses{" "}
            <span className="font-semibold">black + green</span>: the near-black{" "}
            <span className="font-mono">ink-*</span> scale + the logo green (ADR-0010).
            Think-Winners keeps <span className="font-semibold">navy + gold</span>. Neutrals and
            status colours are shared.
          </p>
          <div className="flex max-w-xs flex-col gap-3 rounded-card border border-border bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Black primary · green accent
            </p>
            <Button>Primary action</Button>
            <Button variant="accent">Green accent</Button>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Save changes</Button>
            <Button variant="accent">Download card</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="ghost">View details</Button>
            <Button variant="destructive">Opt out</Button>
            <Button variant="link">Learn more</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Saving…</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Membership number"
              defaultValue="TWM-LA-IKJ-000123"
              hint="Assigned at registration · immutable"
              className="font-mono"
              readOnly
            />
            <Input
              label="Phone"
              defaultValue="0803 000"
              error="Enter a valid 11-digit phone number"
            />
          </div>
        </Section>

        <Section title="Status & roles">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status="active" />
            <StatusPill status="pending" />
            <StatusPill status="frozen" />
            <StatusPill status="rejected" />
            <StatusPill status="deleted" />
            <RoleBadge role="state" />
            <RoleBadge role="leader" />
            <RoleBadge role="member" />
          </div>
        </Section>

        <Section title="Card">
          <Card className="max-w-md">
            <CardTitle>Reward oversight</CardTitle>
            <CardContent className="mt-1">
              Rewards cascade from State → L.G → Unit. Cards are the default
              container: token border, surface, and card radius.
            </CardContent>
          </Card>
        </Section>

        <Section title="Records: same data, two presentations">
          <p className="-mt-2 text-sm text-muted">
            Table on desktop, card list on mobile. Resize to see it switch at the
            <span className="font-mono"> lg </span> breakpoint.
          </p>
          {/* Desktop */}
          <div className="hidden lg:block">
            <DataTable
              columns={columns}
              rows={members}
              getRowKey={(m) => m.id}
              caption="Members in Lagos state"
            />
          </div>
          {/* Mobile */}
          <div className="flex flex-col gap-3 lg:hidden">
            {members.map((m) => (
              <RecordCard
                key={m.id}
                name={m.name}
                identifier={m.no}
                facts={`${m.ward} · ${m.state}`}
                status={m.status}
                actions={
                  <>
                    <Button size="sm" className="flex-1">
                      View
                    </Button>
                    <Button size="sm" variant="secondary" aria-label="More actions">
                      ⋯
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        </Section>

        <p className="text-sm text-muted">
          Primitives live in <span className="font-mono">components/ui/</span> and
          implement <span className="font-mono">docs/design/components.md</span>. This
          gallery is a temporary verification surface.
        </p>
      </div>
    </main>
  );
}
