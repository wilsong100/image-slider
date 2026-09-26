# Then & Now

A before-and-after photo slider for a home renovation. Add a before photo and an after photo of
the same spot, then drag the handle to wipe between them.

- Photos are stored privately in your browser (IndexedDB) — nothing is uploaded.
- Photos are rotated correctly, resized to max 2560px, and re-encoded (which also strips GPS data).
- **Projects**: one per house. Each project has its own comparisons, grouped by room.
  Comparisons can be moved between projects from their Edit screen.
- Comparisons are grouped by room. Works on desktop and phone, in light and dark mode.
- **Line up photos** ("Line up" on a comparison): drag, pinch/zoom and rotate a see-through after
  photo over the before photo; edges are trimmed automatically so the slide looks seamless.
- **Photo dates**: read from each photo when added (editable) and shown on the slider, e.g.
  "Before · Mar 2025", with the time between the two photos.
- **Tour mode** ("▶ Tour" on a project): a full-screen slideshow that sweeps each comparison from
  before to after, room by room. Space pauses, arrow keys skip, Esc exits.
- **Export** ("Export" on a comparison): a looping video (MP4 where supported) or GIF of the slider
  sweeping across, in photo shape, square or 4:5, with optional title and dates. Download or share.
- **Backup & restore** (top-right "Backup"): download everything as one .zip, or load a backup on
  another device. The gallery reminds you when there are changes that aren’t backed up yet.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # production build in dist/
```

## Deploy (GitHub Pages)

Pushes to `main` build, test and deploy automatically via `.github/workflows/deploy.yml`.
One-time setup: in the repo go to **Settings → Pages → Build and deployment → Source** and choose
**GitHub Actions**. The site will be at `https://<user>.github.io/image-slider/`.

See [PLAN.md](PLAN.md) for the roadmap.
