# Before & After Photo Slider — Project Plan

An app for uploading "before" and "after" photos of a home renovation and comparing
them with a draggable slider that shows one photo on top of the other.

---

## 1. Core experience

1. **Create a comparison** – pick a before photo and an after photo, give it a title
   (e.g. "Kitchen – north wall").
2. **View it** – both photos are stacked exactly on top of each other. A vertical
   handle can be dragged left/right; everything left of the handle shows *before*,
   everything right shows *after*.
3. **Browse** – a gallery of all comparisons, grouped by room.

### How the slider works
- Two `<img>` elements absolutely positioned in the same box, same size.
- The top ("after") image is clipped with `clip-path: inset(0 0 0 X%)`, where `X` is the
  handle position. Changing one CSS variable moves the reveal — smooth, no canvas needed.
- Pointer Events (`pointerdown/move/up`) handle mouse, touch and pen with one code path.
- Also usable with the keyboard (arrow keys) and screen readers (`role="slider"`,
  `aria-valuenow`).

---

## 2. Recommended tech stack

| Concern      | Choice                                   | Why |
|--------------|------------------------------------------|-----|
| Framework    | **React + TypeScript + Vite**            | Fast to build, easy to deploy as static files |
| Styling      | Tailwind CSS (or plain CSS modules)      | Quick responsive layouts |
| Storage (v1) | **IndexedDB in the browser** (via `idb`) | No server, no cost, photos stay private on your device |
| Image prep   | Browser canvas / `createImageBitmap`     | Resize + fix phone rotation before saving |
| Hosting      | GitHub Pages / Netlify / Vercel (free)   | Static site, deploys from this repo |
| Installable  | PWA (manifest + service worker)          | "Add to Home Screen" on phone, works offline |
| Tests        | Vitest + Playwright                      | Unit tests for logic, e2e for the slider drag |

**v2 option for sharing:** add a small backend (e.g. Supabase or Firebase) for cloud
storage + a public, read-only share link so family/friends can view without the app.

---

## 3. Data model

```ts
type Room = { id: string; name: string; order: number };

type Comparison = {
  id: string;
  roomId: string;
  title: string;
  notes?: string;          // what was done, contractor, cost…
  beforeImageId: string;
  afterImageId: string;
  beforeDate?: string;     // pulled from photo EXIF when available
  afterDate?: string;
  alignment?: {            // manual fine-tune so photos line up
    scale: number; offsetX: number; offsetY: number; rotate: number;
  };
  createdAt: string;
};

type StoredImage = { id: string; blob: Blob; width: number; height: number; thumb: Blob };
```

---

## 4. Build milestones

### Milestone 1 — MVP (the slider)
- [x] Scaffold Vite + React + TS, lint/format, CI build
- [x] `<CompareSlider before after />` component (drag, touch, keyboard, a11y)
- [x] Upload screen: choose/drag-drop two photos, preview, save
- [x] Image preprocessing: honour EXIF orientation, downscale to ~2560px, JPEG/WebP
- [x] Save to IndexedDB; gallery list with thumbnails; delete/edit
- [x] Deploy to GitHub Pages (workflow ready — enable Pages in repo settings)

### Milestone 2 — Make it great
- [x] Rooms/groups and a room-by-room gallery
- [ ] Full-screen viewer with swipe between comparisons
- [ ] **Alignment editor** – nudge/zoom/rotate the after photo with a 50% opacity
      "onion skin" so both shots line up (see suggestions)
- [ ] Alternate view modes: vertical slider, side-by-side, fade/opacity, tap-to-toggle
- [ ] Notes, dates, costs per comparison
- [x] Export/import a backup (zip of photos + JSON) so nothing is lost — also the migration path into cloud sync later

### Later
- [ ] **Projects** – group comparisons by house, so several properties can live in one app

### Milestone 3 — Share & show off
- [ ] Cloud sync + public read-only share links
- [ ] Export the wipe as an animated GIF / MP4 for social media
- [ ] "Tour mode" – auto-play through every room, slider sweeping automatically

---

## 5. Suggestions to make it better

1. **Photo alignment (biggest quality win).** Before/after photos are rarely taken from
   exactly the same spot. An alignment screen with onion-skin overlay and
   pan/zoom/rotate makes the slider look dramatically better. Later: automatic
   alignment using feature matching (OpenCV.js).
2. **"Ghost camera" for new shots.** When taking an after photo on your phone, show the
   before photo faintly over the live camera so you can line the shot up perfectly.
3. **More than two stages.** Support a timeline (before → demo → during → after) with a
   multi-stop slider or step-through — great for documenting the whole journey.
4. **Room-by-room story.** Group by room, add notes on what was done, cost, and dates;
   generate a summary page ("Kitchen: 6 weeks, new cabinets, knocked out wall").
5. **Floor plan navigation.** Upload a floor plan and pin comparisons to spots on it.
6. **Shareable & exportable.** Read-only links, GIF/video export, printable PDF
   "renovation book".
7. **Handy for resale / insurance.** A record of improvements with dates and receipts
   can help with home value, insurance claims and tax records.
8. **Privacy by default.** Keep photos on-device unless you choose to share; strip GPS
   location from EXIF before any upload.

---

## 6. Decisions

- Private, single user for now → local IndexedDB storage; cloud sync later.
- Phone and desktop → responsive layout, touch + mouse + keyboard.
- ~7–10 pairs → comfortably fits in browser storage.
- Projects (multiple houses) → later improvement.
- Look: "Linen & Terracotta" — warm linen background, terracotta accent, stone grey for
  "before", Fraunces headings with Inter body text, automatic dark mode.
