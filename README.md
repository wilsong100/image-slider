# Then & Now

A before-and-after photo slider for a home renovation. Add a before photo and an after photo of
the same spot, then drag the handle to wipe between them.

- Photos are stored privately in your browser (IndexedDB) — nothing is uploaded.
- Photos are rotated correctly, resized to max 2560px, and re-encoded (which also strips GPS data).
- Comparisons are grouped by room. Works on desktop and phone, in light and dark mode.

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
