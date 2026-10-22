# AquaNest™ Showreel (30s, 1920×1080)

This folder is the source for `marketing/AquaNest-Showreel-30s.mp4`. The video is built with [Remotion](https://www.remotion.dev): every animation is React code driven by the frame number, so you can re-render it any time.

```bash
cd marketing/showreel
npm install
npm run studio   # live preview & scrubbing in the browser
npm run render   # → out/aquanest-showreel.mp4 (H.264, CRF 16, 320 kbps audio)
```

## How it fits together

| Path | What it is |
|---|---|
| `src/timing.json` | **Single source of truth.** Scene cuts (snapped to the 110 BPM beat grid and to pauses in the voice-over) plus the time of every pop, cross-out and counter. Both the animation and the audio mixer read this file. |
| `src/scenes/intro.tsx` | Hook → Problem (cross-out) → Solution ("Panahon na para mag-upgrade!" + glass card) |
| `src/scenes/showcase.tsx` | Customer, Rider and Admin showcases: real screenshots with Ken Burns moves, floating UI cards and whip-pans |
| `src/scenes/outro.tsx` | Benefits (icon pops + product lineup) → CTA (drop splash, logo, button click, contacts) |
| `src/ui/kit.tsx` | Backgrounds, droplets, splash physics, browser/phone frames, icons |
| `tools/capture.mjs` | Re-captures the real app screens from the running app (`npm run dev` in the app first) |
| `tools/audio.py` | Synthesizes the music bed and sound effects, then mixes them with the ElevenLabs voice-over into `public/audio/master.wav` |
| `public/audio/vo.mp3` | The ElevenLabs voice-over ("DenMark", eleven_v4, take 1, 27.6 s) |

## Making changes

**Moving a moment:** edit `src/timing.json`, run `python3 tools/audio.py` so the SFX follow, then render again.

**Swapping the voice-over:** replace `public/audio/vo.mp3`. If phrase timing changes, re-check the cut times (`ffmpeg -i vo.mp3 -af silencedetect=noise=-35dB:d=0.18 -f null -` prints the pauses), then re-run `tools/audio.py`.

**Updating screenshots:** start the app and run `node tools/capture.mjs`. It needs a `tools/sessions.json` file of signed demo-session cookies (`{"customer": "...", "admin": "...", "rider": "..."}`), signed with the app's `AUTH_SECRET`. It is deliberately not committed.

**Audio specs:** about −14 LUFS integrated, −0.5 dBTP peak (YouTube, Facebook and IG friendly). The music is ducked about 5 dB under the voice and sidechained to the kick.

The music and sound effects are synthesized in `tools/audio.py`, so there are no third-party samples or licences to track. The voice-over was generated with ElevenLabs on your account.
