# Leader portraits

Supplied by the client on 2026-07-29 for CR-0010. All rights belong to the ThinkRich
Community and the photographers they commissioned.

## What ships

The site references only these five, generated for T-053. Each is a 4:5
head-and-shoulders crop normalised to 1000x1250, stripped of metadata, quality 84:

| File | Officer |
|------|---------|
| `president-1.jpg` | Chief Amb. Dr Salami Saidi Oladimeji, President (primary) |
| `president-2.jpg` | the same, second portrait, used as the smaller crop in the spread |
| `vice-president.jpg` | Oluwaseun Omoniyi Akinbiyi, Vice President |
| `secretary.jpg` | Idowu Olaitan Bolatito, Secretary |
| `treasurer.jpg` | Onayale Iyanuoluwa, Treasurer |

## The originals

`salami.jpeg`, `salami2.jpeg`, `oluwaseun.jpeg`, `oluwaseun2.jpeg`, `idowu.jpeg` and
`onayale.jpeg` are the client's untouched files, kept as the source of truth so the
crops can be redone. Nothing links to them.

Two things worth knowing before anyone re-crops:

- **`idowu.jpeg` carries a photographer's watermark** ("Twelve02 Photography") in the
  bottom right. The shipped crop excludes it. Any wider crop will put it back on the
  page, which is third-party branding on the client's site.
- **`oluwaseun.jpeg` is unusable at portrait sizes.** It is a full-length shot across a
  hall; the head is about 170px tall in an 851x1280 frame, so a head-and-shoulders crop
  is roughly 350px wide and too soft for any tile. `oluwaseun2.jpeg` is the studio
  portrait and is what ships. A replacement second image for the Vice President is an
  open request to the client (CR-0010 §8).

## Reproducing the crops

Geometry is `WxH+X+Y` in the original's pixels, chosen off each photo's own framing:

```sh
magick salami.jpeg     -crop 1024x1280+68+0 +repage -resize 1000x1250^ -gravity center \
  -extent 1000x1250 -strip -quality 84 president-1.jpg
magick salami2.jpeg    -crop 1024x1280+88+0 +repage -resize 1000x1250^ -gravity center \
  -extent 1000x1250 -strip -quality 84 president-2.jpg
magick oluwaseun2.jpeg -crop 680x850+80+40  +repage -resize 1000x1250^ -gravity center \
  -extent 1000x1250 -strip -quality 84 vice-president.jpg
magick idowu.jpeg      -crop 760x950+110+20 +repage -resize 1000x1250^ -gravity center \
  -extent 1000x1250 -strip -quality 84 secretary.jpg
magick onayale.jpeg    -crop 800x1000+30+40 +repage -resize 1000x1250^ -gravity center \
  -extent 1000x1250 -strip -quality 84 treasurer.jpg
```

## A note on colour

The five backgrounds do not match: charcoal, brown, cream, terracotta, and a green
outdoor wall. Monochrome or duotone would unify them at a cost we judged too high, since
the purple and gold of the aso-oke is part of these people's identity, not decoration.
The section unifies them through consistent framing instead. The durable fix is a
consistent photo set from one session, which is a client request, not a code change.
