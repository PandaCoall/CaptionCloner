# Caption Cloner

Clone a short-form caption style from a still, then burn speech-timed captions onto your own talking video.

No JSON2Video. No database. Style state lives in the page and in `localStorage`.

## What it does

1. Drop a reference frame. Grok vision reads font, size, colours, outline, shadow, line length, and vertical position. The preview shows the caption text from that frame.
2. Drop a video that has dialogue.
3. The server extracts audio with ffmpeg, transcribes it with Grok STT (word timestamps), writes an ASS subtitle file in the cloned style, and burns it onto the video with ffmpeg karaoke timing.

## Stack

- Next.js 14 App Router + TypeScript + Tailwind
- xAI Grok 4.6 vision (`/api/extract`)
- xAI Grok STT (`/v1/stt`)
- local ffmpeg

## Environment

```
XAI_API_KEY=xai-...
```

Key is read only in route handlers. Get one at https://console.x.ai

ffmpeg must be on `PATH`.

## Setup

```bash
npm install
cp .env.example .env.local
# set XAI_API_KEY
npm run dev
```

Open http://localhost:3000

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/extract` | Image → `{ style, background, caption, highlight }` |
| `POST` | `/api/render` | Video + style → burned-in MP4 |
