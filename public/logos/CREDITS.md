# Logos

Client-supplied brand artwork. All rights belong to the ThinkRich Community.

## What ships

| File | Used by | Notes |
|------|---------|-------|
| `thinkrich-mark.png` | nav, compact footers | 630x400. The striding figure alone, paired with live text. |
| `thinkrich-lockup.png` | umbrella landing footer | 900x754. Full artwork: figure, name, tagline. |

Both are consumed through [`components/marketing/thinkrich-logo.tsx`](../../components/marketing/thinkrich-logo.tsx),
which holds their intrinsic dimensions so the aspect ratio cannot drift.

## Sources

`ThinkrichCommunity_transparent.png` is the client's original and the source of the two
derived files above. `TCMS_transparent.png` and `BeRich_transparent.png` are also
originals, currently **unused** (see below).

### Two traps in the original, both handled by the derivation

1. **A 1px pale yellow frame is baked into the edges** (`srgba(243,250,217,1)` at the
   border columns). It is invisible on white and renders as a hard rectangle on any dark
   ground, which is every surface this brand uses. `-trim` alone does **not** remove it:
   trim stops at the frame and reports the full 1064x1064 canvas. The frame must be
   shaved first, which also reveals a wide empty margin: real content is 862x722.
2. **The name is set in a blackletter script** that turns to mush below roughly 120px
   wide. That is why the nav uses the mark plus live text rather than the full lockup:
   at 30px tall the supplied wordmark would be illegible, and baking a name into an image
   costs selectable, translatable, screen-reader-native text.

### Reproducing

```sh
SRC=ThinkrichCommunity_transparent.png

# Mark only: shave the frame, crop above the wordmark band, trim to content.
magick "$SRC" -shave 8x8 +repage -crop 1056x612+0+142 +repage -trim +repage \
  -resize x400 -colors 128 -define png:compression-level=9 -strip thinkrich-mark.png

# Full lockup: shave the frame, trim the margin.
magick "$SRC" -shave 8x8 +repage -trim +repage \
  -resize 900x -colors 256 -define png:compression-level=9 -strip thinkrich-lockup.png
```

Palette quantisation is what keeps these small: the lockup drops from 208KB to 66KB at
256 colours, with an RMSE of 0.8% against the full-depth version and no visible banding
in the green gradient. Do **not** write these as `PNG32:` — that forces 32-bit and undoes
the quantisation while keeping the same pixels.

## The palette comes from here

The logo's greens sample to `#049050` and `#066B41`, which land almost exactly on the
`green-500` / `green-700` tokens in `app/globals.css`. That is not a coincidence:
ADR-0010 derived the umbrella palette from this artwork. The logo also carries an orange
in its tagline that has **no token**, so it appears only inside the lockup image and is
never reproduced in CSS.

## Unused originals

`TCMS_transparent.png` is the Cooperative arm ("Thinkrich Cooperative and Multipurpose
Society", motto "Let get richer together"), which maps to the `MCPS` arm on the landing.
`BeRich_transparent.png` does not map to any of the six arms we list.

Neither is wired up, deliberately. Both are red/blue/yellow shield-and-sunburst marks,
one containing a stock photograph of a handshake. Dropped into the arms explorer on its
ink ground beside the green umbrella mark, they read as clip art and break the section's
coherence. Using them well needs either a redraw in the umbrella palette or a decision
from the client to accept the clash. Until then the arms keep their monogram placeholders
(`components/marketing/arm-mark.tsx`), which are at least deliberate and on-brand.
