"""
AquaNest showreel audio: synthesized 110 BPM music bed + SFX, mixed with the ElevenLabs VO.
Reads ../src/timing.json so every hit lands on the same frames as the animation.
Output: ../public/audio/master.wav (48 kHz stereo) plus stems for reference.
"""
import json, os, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
T = json.load(open(os.path.join(ROOT, "src", "timing.json")))
SR = 48000
DUR = T["duration"]
N = int(SR * DUR)
BEAT = 60 / T["bpm"]
BAR = BEAT * 4
C, E = T["cuts"], T["events"]
rng = np.random.default_rng(7)


def buf():
    return np.zeros((N, 2))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(dst, sig, t, gain=1.0, pan=0.0):
    """Add mono or stereo signal at time t (s)."""
    i = int(t * SR)
    if i >= N:
        return
    if sig.ndim == 1:
        l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], axis=1)
    j = min(N, i + len(sig))
    if i < 0:
        sig = sig[-i:]
        i = 0
    dst[i:j] += sig[: j - i] * gain


def fir(kind, fc, taps=511, fc2=None):
    n = np.arange(taps) - (taps - 1) / 2
    w = np.blackman(taps)
    def lp(f):
        h = np.sinc(2 * f / SR * n) * 2 * f / SR
        return h * w / np.sum(h * w)
    if kind == "lp":
        return lp(fc)
    if kind == "hp":
        h = -lp(fc)
        h[(taps - 1) // 2] += 1
        return h
    if kind == "bp":
        return lp(fc2) - lp(fc)


def filt(x, h):
    return np.convolve(x, h, mode="same")


def env(n, a=0.002, d=0.2, s=0.0, r=0.05, hold=None):
    t = np.arange(n) / SR
    e = np.where(t < a, t / a, np.exp(-(t - a) / max(d, 1e-4)) * (1 - s) + s)
    if hold is not None:
        rel = t > hold
        e[rel] *= np.exp(-(t[rel] - hold) / r)
    return e


def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * f + phase) % 1) - 1


def sine(f, n):
    return np.sin(2 * np.pi * f * np.arange(n) / SR)


# ── instruments ────────────────────────────────────────────────
def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.28)
    click = filt(rng.standard_normal(n), fir("hp", 3000, 101)) * np.exp(-t / 0.004) * 0.4
    return np.tanh((body + click) * 1.6) * 0.9


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = filt(rng.standard_normal(n), fir("bp", 900, 255, 3200))
    e = np.zeros(n)
    for off in (0, 0.011, 0.022):
        k = t >= off
        e[k] += np.exp(-(t[k] - off) / (0.012 if off < 0.02 else 0.13))
    return noise * e * 0.9


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    noise = filt(rng.standard_normal(n), fir("hp", 7500, 101))
    return noise * np.exp(-t / (0.07 if open_ else 0.012)) * 0.35


def supersaw(m_list, n, cutoff, detune=0.12, voices=5):
    out = np.zeros(n)
    for m in m_list:
        f = mtof(m)
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
            out += saw(f * 2 ** (d / 12), n, rng.random())
    out /= len(m_list) * voices
    return filt(out, fir("lp", cutoff, 255))


def pluck(m_list, length=0.32, cutoff=3200):
    n = int(length * SR)
    s = supersaw(m_list, n, cutoff, detune=0.08, voices=3)
    return s * env(n, 0.003, 0.11, 0.0) * 1.4


def bass_note(m, length):
    n = int(length * SR)
    f = mtof(m)
    s = 0.75 * sine(f, n) + 0.25 * filt(saw(f, n), fir("lp", 380, 255))
    return s * env(n, 0.004, 0.25, 0.65, 0.03, hold=length * 0.85)


def pad(m_list, length, cutoff):
    n = int(length * SR)
    s = supersaw(m_list, n, cutoff, detune=0.18, voices=6)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.25) * np.minimum(1, (length - t) / 0.3).clip(0, 1)
    return s * e


# I–V–vi–IV in G, voice-led
CHORDS = [
    {"root": 31, "notes": [55, 59, 62], "arp": [67, 71, 74, 79]},  # G
    {"root": 26, "notes": [54, 57, 62], "arp": [66, 69, 74, 78]},  # D
    {"root": 28, "notes": [55, 59, 64], "arp": [67, 71, 76, 79]},  # Em
    {"root": 24, "notes": [55, 60, 64], "arp": [67, 72, 76, 79]},  # C
]


def chord_at(t):
    return CHORDS[int(t // BAR) % 4]


drums, bass, music, sfx = buf(), buf(), buf(), buf()
side = np.ones(N)  # sidechain gain for tonal parts

K = kick()
def kick_at(t, g=1.0):
    place(drums, K, t, g)
    i = int(t * SR)
    n = int(0.35 * SR)
    j = min(N, i + n)
    tt = np.arange(j - i) / SR
    side[i:j] = np.minimum(side[i:j], 1 - 0.7 * np.exp(-tt / 0.11))


beats = np.arange(0, DUR, BEAT)
s_prob, s_sol, s_cta = C["problem"], C["solution"], C["cta"]
drop_end = s_cta - BEAT  # last beat before CTA is a breakdown gap

for b in beats:
    bi = int(round(b / BEAT))
    # ── HOOK: pad + filtered pluck pulse
    if b < s_prob:
        if bi % 2 == 0:
            kick_at(b, 0.75)
        place(music, pluck(chord_at(b)["notes"], 0.28, 2400), b + BEAT / 2, 0.6)
        place(bass, bass_note(chord_at(b)["root"] + 12, BEAT * 0.9), b, 0.5)
        place(drums, hat(), b + BEAT / 2, 0.35)
    # ── PROBLEM: half-time, darker
    elif b < s_sol - 1e-3:
        if bi % 2 == 0:
            kick_at(b, 0.85)
        place(drums, hat(), b + BEAT / 2, 0.6)
        place(music, pluck(chord_at(b)["notes"], 0.3, 1800), b + BEAT / 2, 0.38)
        place(bass, bass_note(chord_at(b)["root"] + 12, BEAT * 0.9), b, 0.55)
    # ── DROP + CTA: full groove
    elif b < drop_end - 1e-3 or b >= s_cta - 1e-3:
        if not (b > DUR - BAR * 0.75):
            kick_at(b)
        if bi % 2 == 1:
            place(drums, clap(), b, 0.55)
        for k in range(4):
            place(drums, hat(open_=(k == 2)), b + k * BEAT / 4, 0.38 if k == 2 else 0.2, pan=0.25 if k % 2 else -0.2)
        ch = chord_at(b)
        for k in (0, 1):
            place(bass, bass_note(ch["root"] + 12, BEAT / 2 * 0.92), b + k * BEAT / 2, 0.7)
        # offbeat stabs
        place(music, pluck(ch["notes"], 0.22, 4200), b + BEAT / 2, 0.42)
        # 16th arp (brighter in benefits + CTA)
        bright = b >= C["benefits"] - 1e-3
        for k in range(4):
            m = ch["arp"][(bi * 4 + k) % 4] + (12 if bright and k % 2 else 0)
            n = int(0.18 * SR)
            note = (0.6 * sine(mtof(m), n) + 0.4 * filt(saw(mtof(m), n), fir("lp", 5000, 127))) * env(n, 0.002, 0.07)
            place(music, note, b + k * BEAT / 4, 0.16, pan=-0.35 if k % 2 else 0.35)

# pads per bar (lift filter in the drop)
for bar_t in np.arange(0, DUR, BAR):
    ch = chord_at(bar_t)
    cutoff = 1800 if bar_t < s_sol else (2600 if bar_t < s_cta else 3400)
    place(music, pad(ch["notes"], BAR + 0.05, cutoff), bar_t, 0.32)

# final ringing chord & tail
place(music, pad([55, 59, 62, 67], 2.4, 3000), DUR - 2.4, 0.4)

# snare roll into the drop
for k, t in enumerate(np.arange(s_sol - BEAT * 2, s_sol, BEAT / 4)):
    place(drums, clap(), t, 0.15 + 0.06 * k)


# ── risers / impacts ───────────────────────────────────────────
def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    lo = filt(noise, fir("bp", 400, 255, 1500))
    hi = filt(noise, fir("bp", 2500, 255, 9000))
    x = t / length
    tone = sine(1, n) * 0
    f = 200 + 1200 * x ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    return ((1 - x) * lo + x * hi + tone) * x ** 2 * 0.6


def impact():
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    f = 38 + 50 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    crash = filt(rng.standard_normal(n), fir("hp", 4000, 127)) * np.exp(-t / 0.6) * 0.25
    return np.tanh((boom + crash) * 1.3) * 0.8


def reverse_swell(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    s = filt(rng.standard_normal(n), fir("hp", 3000, 127)) * (t / length) ** 3
    return s * 0.5


place(sfx, impact(), 0.0, 0.45)
place(sfx, riser(1.4), s_prob - 1.4, 0.45)
place(sfx, riser(1.6), s_sol - 1.6, 0.7)
place(sfx, impact(), s_sol, 0.75)
place(sfx, riser(1.5), s_cta - 1.5, 0.7)
place(sfx, reverse_swell(0.9), s_cta - 0.9, 0.7)
place(sfx, impact(), s_cta, 0.8)


# ── SFX ────────────────────────────────────────────────────────
def whoosh(length=0.55, up=True):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = t / length
    noise = rng.standard_normal(n)
    a = filt(noise, fir("bp", 300, 255, 1200))
    b = filt(noise, fir("bp", 1500, 255, 6000))
    mix = (1 - x) * a + x * b if up else x * a + (1 - x) * b
    e = np.sin(np.pi * x) ** 1.5
    return mix * e * 0.9


def pop(f0=900, f1=320):
    n = int(0.13 * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.018)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045)
    return s * 0.75


def water_drop():
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = 520 + 1500 * (1 - np.exp(-t / 0.035))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08)
    s2 = np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * np.exp(-t / 0.05) * 0.3
    out = s + s2
    # small room
    for d, g in ((0.043, 0.35), (0.071, 0.25), (0.113, 0.15)):
        k = int(d * SR)
        out[k:] += out[:-k] * g
    return out * 0.7


def cash_register():
    n = int(1.3 * SR)
    t = np.arange(n) / SR
    bell = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / dcy) * g for f, dcy, g in ((2093, 0.5, 0.5), (3136, 0.35, 0.35), (4186, 0.2, 0.2), (5274, 0.12, 0.12)))
    k = int(0.09 * SR)
    bell2 = np.zeros(n)
    bell2[k:] = bell[:-k] * 0.8
    drawer = filt(rng.standard_normal(n), fir("bp", 1500, 255, 6000)) * np.exp(-t / 0.05) * 0.6
    return (bell + bell2 + drawer) * 0.5


def scribble():
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    noise = filt(rng.standard_normal(n), fir("bp", 1800, 255, 5500))
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 38 * t)
    return noise * am * np.sin(np.pi * t / t[-1]) * 0.8


def click():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.006) + filt(rng.standard_normal(n), fir("hp", 5000, 63)) * np.exp(-t / 0.004)) * 0.6


# transitions
place(sfx, whoosh(0.7), 0.0, 0.45)
for t in (C["problem"], C["customer"], C["rider"], C["admin"], C["benefits"]):
    place(sfx, whoosh(0.6), t - 0.32, 0.55, pan=0.2)
place(sfx, whoosh(0.5, up=False), E["upgradeCard"] - 0.25, 0.4, pan=-0.2)
# hook
place(sfx, water_drop(), 0.18, 0.6)
for i, t in enumerate(E["hookWords"]):
    place(sfx, pop(1000 + 80 * i, 360), t, 0.28, pan=-0.3 + 0.15 * i)
# problem
for i, t in enumerate(E["problemChips"]):
    place(sfx, pop(820, 300), t, 0.4, pan=-0.4 + 0.4 * i)
for i, t in enumerate(E["crossOut"]):
    place(sfx, scribble(), t, 0.55, pan=-0.4 + 0.4 * i)
# solution
for i, t in enumerate(E["featureChips"]):
    place(sfx, pop(1100, 420), t, 0.4, pan=-0.3 + 0.3 * i)
# showcase
for t in E["customerCards"] + E["riderCards"] + E["adminCards"]:
    place(sfx, pop(950, 380), t, 0.3)
place(sfx, cash_register(), E["adminCountEnd"], 0.55)
# benefits
for i, t in enumerate(E["benefitPops"]):
    place(sfx, pop(1150 + 60 * i, 420), t, 0.5, pan=-0.2 + 0.1 * i)
# CTA
place(sfx, water_drop(), E["logoDrop"] - 0.05, 0.75)
place(sfx, pop(900, 350), E["button"], 0.4)
place(sfx, click(), E["buttonClick"], 0.6)
place(sfx, pop(1200, 500), E["contacts"], 0.3)


# ── voice-over ─────────────────────────────────────────────────
vo_path = os.path.join(ROOT, "public", "audio", "vo.mp3")
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", vo_path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
vo_mono = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
vo_mono = filt(vo_mono, fir("hp", 80, 255))
vo = buf()
place(vo, vo_mono, T["voOffset"], 1.0)

# VO envelope → duck music
win = int(0.06 * SR)
venv = np.sqrt(np.convolve(vo[:, 0] ** 2, np.ones(win) / win, mode="same"))
venv = np.clip(venv / (venv.max() * 0.25), 0, 1)
smooth = int(0.15 * SR)
venv = np.convolve(venv, np.ones(smooth) / smooth, mode="same")
duck = 1 - 0.45 * venv  # ≈ -5 dB under speech


def norm_peak(x, peak):
    m = np.abs(x).max()
    return x * (peak / m) if m > 0 else x


tonal = (music + bass) * side[:, None]
mus = norm_peak(drums * 0.9 + tonal, 0.9)
mus *= duck[:, None]
# fades
fade_in = np.minimum(1, np.arange(N) / (0.05 * SR))
fade_out = np.clip((DUR - np.arange(N) / SR) / 0.8, 0, 1)
mus *= (fade_in * fade_out)[:, None]

mix = mus * 0.42 + norm_peak(sfx, 0.9) * 0.5 + norm_peak(vo, 0.95) * 0.95
mix = np.tanh(mix * 1.15) / np.tanh(1.15)  # gentle bus saturation / limiter
mix = norm_peak(mix, 0.94)


def write(path, x):
    x16 = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(x16.tobytes())


out = os.path.join(ROOT, "public", "audio")
write(os.path.join(out, "master.wav"), mix)
write(os.path.join(out, "stem-music.wav"), norm_peak(mus, 0.9))
write(os.path.join(out, "stem-sfx.wav"), norm_peak(sfx, 0.9))
print("master.wav written", mix.shape, "VO samples", len(vo_mono) / SR, "s")
