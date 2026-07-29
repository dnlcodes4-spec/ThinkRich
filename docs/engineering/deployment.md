# Deployment & DNS

How this product reaches the internet: one Vercel project, one build, **two origins**.

| Origin | Serves |
|--------|--------|
| `thinkrichcommunity.com` (+ `www.`) | The ThinkRich Community umbrella landing, and nothing else |
| `thinkwinners.thinkrichcommunity.com` | Think-Winners: its landing at the root, `/login`, and every `/app` dashboard |

The split is decided per request from the `Host` header in [`proxy.ts`](../../proxy.ts).
Why it works this way: [ADR-0014](../architecture/decisions/0014-two-origin-host-split.md).
Why it exists: [CR-0008](../project/change-requests/0008-two-origin-split-apex-landing-thinkwinners-subdomain.md).

> **The split is addressing, not access control.** Authorization is Postgres RLS
> ([ADR-0005](../architecture/decisions/0005-rls-as-authorization-boundary.md)). Never treat a
> hostname as a permission, and never move a control from RLS into the proxy.

---

## Environment variables

| Variable | Where | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | all | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | **Never** expose to the client |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | all | |
| `VAPID_PRIVATE_KEY` | server only | **Never** expose to the client |
| `NEXT_PUBLIC_APEX_HOST` | **production only** | Bare hostname, e.g. `thinkrichcommunity.com` |
| `NEXT_PUBLIC_THINK_WINNERS_HOST` | **production only** | Bare hostname, e.g. `thinkwinners.thinkrichcommunity.com` |
| `ENABLE_INTERNAL_PAGES` | opt-in | `1` exposes internal verification pages. Leave unset on public deploys |

Two rules that are easy to get wrong:

1. **Set the two host variables on the Production environment only.** Preview and Development must
   leave them unset. Previews have no subdomain, so a configured split would make every preview
   redirect itself into production.
2. **Bare hostnames.** No scheme, no port, no trailing slash. `lib/env.ts` rejects anything else at
   startup rather than failing mysteriously at request time.

Both are `NEXT_PUBLIC_*` and therefore **inlined at build time**. Changing either requires a
redeploy, not just a restart.

---

## First-time domain setup

### 1. Vercel

Project → **Settings → Domains → Add**, once per hostname:

- `thinkrichcommunity.com`
- `www.thinkrichcommunity.com` (redirect to apex)
- `thinkwinners.thinkrichcommunity.com`

Add the domain **before** touching DNS: Vercel then shows the exact record to create. Do not rely
on a remembered CNAME target. Vercel hands out region-specific values, so copy what the dashboard
shows for that domain.

### 2. Namecheap DNS

Domain List → **Manage** → **Advanced DNS**.

Check two things first, because they cause most "Invalid Configuration" states:

- **Nameservers** (Domain tab) must be **Namecheap BasicDNS**. If they point elsewhere, the
  Advanced DNS tab is ignored entirely.
- **Delete the default parking records.** A fresh Namecheap domain ships with
  `CNAME www → parkingpage.namecheapbest.com` and a `URL Redirect Record` on `@`. Both conflict.

Then:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `@` | `76.76.21.21` | Automatic |
| CNAME Record | `www` | the value Vercel shows | Automatic |
| CNAME Record | `thinkwinners` | the value Vercel shows | Automatic |

The apex cannot be a CNAME, which is why it is an A record.

`Host` is the label only. Entering `thinkwinners.thinkrichcommunity.com` yields
`thinkwinners.thinkrichcommunity.com.thinkrichcommunity.com`.

### 3. Verify

Vercel flips each domain to **Valid Configuration** and issues a Let's Encrypt certificate,
usually within ten minutes.

```bash
dig thinkwinners.thinkrichcommunity.com CNAME +short
dig thinkrichcommunity.com A +short
```

---

## Verifying the split

Against production, or locally against `npm run build && npm start` with both host variables set:

```bash
BASE=http://127.0.0.1:3000   # or https://thinkrichcommunity.com
probe() { curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  -H "Host: $1" -H "X-Forwarded-Proto: https" "$BASE$2"; }

probe thinkrichcommunity.com /                     # 200, umbrella landing
probe thinkrichcommunity.com /app                  # 307 → thinkwinners…/app
probe thinkrichcommunity.com /login                # 307 → thinkwinners…/login
probe thinkrichcommunity.com /think-winners        # 307 → thinkwinners…/
probe thinkwinners.thinkrichcommunity.com /        # 200, Think-Winners landing
probe thinkwinners.thinkrichcommunity.com /login   # 200
probe thinkwinners.thinkrichcommunity.com /think-winners  # 307 → …/  (canonical)
```

The `Host` header is what the proxy reads, so this exercises the real routing without DNS.

Two things worth checking by eye after a deploy:

- The apex landing still renders its hero artwork. Those images live under `public/think-winners/`
  and their URLs collide with the `/think-winners` route subtree; an extension check in
  `isPassThroughPath` is what keeps them from being redirected away.
- `thinkwinners.…/` shows the Think-Winners title, not the ThinkRich one.

---

## Rollback

In order of blast radius, smallest first.

1. **Unset `NEXT_PUBLIC_APEX_HOST` and `NEXT_PUBLIC_THINK_WINNERS_HOST` in Vercel, then redeploy.**
   The split becomes a no-op and every surface is reachable on both origins again. This is the
   intended first move and needs no code change.
2. **Revert the merge commit.** No database migration is involved, so there is nothing to undo in
   Postgres.
3. **DNS can stay.** The subdomain records are harmless with the split off; removing them is not
   part of a rollback.

Redirects are deliberately **307 (temporary)** for exactly this reason. A 308 would be cached hard
by browsers and would keep sending users to the subdomain long after a rollback. Promote to 308
only once the split has been stable in production for a while, and treat that as a one-way door.

---

## The PWA

The installable app is the members' app at `/app` on the Think-Winners origin. Service workers are
origin-scoped, so:

- `app/manifest.ts` declares `scope: "/app"`, not `/`.
- `ServiceWorkerRegistrar` mounts in the **app shell** ([app/app/layout.tsx](../../app/app/layout.tsx)),
  not the root layout, so the umbrella landing never registers a worker or offers an install.

Consequence worth remembering: **moving the app to another origin strands existing installs.**
They cannot be migrated remotely; users must reinstall. The split was done in July 2026 precisely
because the install base was still zero. Any future origin move needs a real migration plan.
