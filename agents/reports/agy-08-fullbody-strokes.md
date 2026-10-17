# Task Report: agy-08 — Full-Body Procedural Stroke Animations

## Changed Files
- `src/player.js`: Extended procedural pose system (`P()`, `PREP`, `SWINGS`, `SERVE_READY`, `SERVE_BACK`, `SERVE_SWING`, and `createAvatar().update()`) from upper-body-only (`spine_02` + arms) to the full 65-bone UE rig (`pelvis`, `spine_02`, `spine_03`, `neck_01`, racket/ball arms, and racket/ball legs `thigh`/`calf`/`foot`).
- `tools/posetest.html`: Interactive visual pose inspector loading a right-handed character (`Ahmet`) and a left-handed character (`Aydın`) side-by-side with stroke/stance selector, keyframe presets (`0.00s`, `0.03s`, `0.07s`, `0.28s`, `0.55s`), `t` scrubber (`0..0.55s`), locomotion blend selector (`idle` / `walk` / `run`), and 3D ball position controls for head tracking and low-ball lunges.

---

## 1. Pose Format & Bone Mapping (`src/player.js`)
- Extended `P(o)` with zero-initialized defaults for full backward compatibility:
  - `hips: [0, 0, 0]` → `pelvis` (hip rotation & coil/uncoil leading the torso)
  - `spine: [0, 0, 0]` → `spine_02` (lower/mid spine pitch & twist)
  - `chest: [0, 0, 0]` → `spine_03` (shoulder/upper-torso rotation & separation)
  - `head: [0, 0, 0]` → `neck_01` (chin-over-shoulder prep & dynamic 3D ball tracking)
  - `rThigh`, `rCalf`, `rFoot` → `thigh_${R}`, `calf_${R}`, `foot_${R}` (racket-side / rear leg)
  - `bThigh`, `bCalf`, `bFoot` → `thigh_${B}`, `calf_${B}`, `foot_${B}` (ball-hand / front leg)
- Left-handed mirroring (`m = lefty ? -1 : 1`, `R`/`B` swap) applies `[x * w, y * m * w, z * m * w]` across all new bone channels without allocating per-frame objects (`q` and `e` are reused).
- Floor pinning (`root.position.y = 0; root.position.y = restFoot - lowestFoot()`) is evaluated **after** applying procedural leg and hip offsets so knee bends and lunges automatically drop the pelvis while keeping the lowest foot planted on the court (`y ≈ 0.02m`).

---

## 2. Stance Preparation, Low-Ball Lunge & Head Tracking
- **Athletic Ready / Prep Stances (`PREP.*`)**:
  - Knees bent (`thigh ≈ -0.35..-0.38`, `calf ≈ +0.58..+0.62`, `foot ≈ -0.23..-0.24`), lowering pelvis height from `0.77m` (idle) to `~0.60m`.
  - Hip-shoulder separation: `hips` and `chest` coil in addition to whole-body `yaw`, loading weight onto the rear leg (`rLeg` in `forehand`/`overhead`, `bLeg` in `backhand`).
- **Low-Ball Lunge (`ball[1] < 0.6`)**:
  - Replaced excessive spine bending (`spine[0] += 0.4`) with a true lower-body lunge: reduced spine bend (`hips[0] += 0.12`, `spine[0] += 0.16`) combined with deep front-knee flexion (`fThigh[0] -= 0.36`, `fCalf[0] += 0.54`, `fFoot[0] -= 0.18`) and rear-knee drop (`kThigh[0] -= 0.24`, `kCalf[0] += 0.56`), lowering pelvis height to `~0.44m` while keeping feet grounded.
- **Head Ball Tracking (`neck_01`)**:
  - Computes ball vector relative to the player's accumulated torso yaw (`s[2] + (yaw + hips[1] + spine[1] + chest[1]) * m`) and torso pitch, blending smoothly with keyframe head offsets and clamping pitch/yaw within `[-0.6, 0.6]` rad.

---

## 3. Stroke Keyframe Tables (Kinetic Chain: Leg → Hip → Chest → Arm)

### `forehand`
| `t` (s) | Phase | `yaw` | `hips` | `chest` | `rLeg` (`rThigh` / `rCalf` / `rFoot`) | `bLeg` (`bThigh` / `bCalf` / `bFoot`) | Notes |
|---|---|---|---|---|---|---|---|
| `0.00` | Prep (`PREP.forehand`) | `-0.70` | `[+0.06, -0.18, +0.04]` | `[+0.05, -0.22, +0.06]` | `[-0.38, -0.08, +0.14]` / `0.62` / `-0.24` | `[-0.35, +0.06, -0.10]` / `0.58` / `-0.23` | Coiled unit turn, rear leg loaded (`pelvisY: 0.60m`) |
| `0.03` | Leg Push & Hip Lead | `-0.30` | `[+0.08, +0.24, +0.01]` | `[+0.08, -0.18, +0.03]` | `[-0.32, +0.04, +0.10]` / `0.58` / `+0.08` | `[-0.32, +0.02, -0.08]` / `0.52` / `-0.20` | Hips fire open `+0.42 rad` while chest lags (`-0.18`) |
| `0.07` | Contact | `+0.05` | `[+0.10, +0.28, 0.00]` | `[+0.10, +0.18, -0.04]` | `[-0.26, +0.12, +0.08]` / `0.58` / `+0.25` | `[-0.30, -0.04, -0.06]` / `0.48` / `-0.18` | Chest uncoils into contact; weight shifts to front foot |
| `0.28` | Follow-Through | `+0.48` | `[+0.08, +0.30, -0.02]` | `[+0.10, +0.32, -0.06]` | `[-0.24, +0.22, +0.06]` / `0.62` / `+0.42` | `[-0.26, -0.06, -0.05]` / `0.44` / `-0.18` | Rear heel lifts (`rFoot: +0.42`), racket wraps across shoulder |
| `0.55` | Recovery | `0.00` | `[0, 0, 0]` | `[0, 0, 0]` | `[0, 0, 0]` / `0` / `0` | `[0, 0, 0]` / `0` / `0` | Smooth return to ready pose |

### `backhand` (One-Handed Padel Backhand)
| `t` (s) | Phase | `yaw` | `hips` | `chest` | `rLeg` (`rThigh` / `rCalf` / `rFoot`) | `bLeg` (`bThigh` / `bCalf` / `bFoot`) | Notes |
|---|---|---|---|---|---|---|---|
| `0.00` | Prep (`PREP.backhand`) | `+0.85` | `[+0.06, +0.18, -0.04]` | `[+0.06, +0.24, -0.06]` | `[-0.35, -0.06, +0.10]` / `0.58` / `-0.23` | `[-0.38, +0.08, -0.14]` / `0.62` / `-0.24` | Racket drawn across body, weight on non-racket (`bLeg`) rear leg |
| `0.03` | Hip Uncoil | `+0.45` | `[+0.08, -0.22, -0.01]` | `[+0.08, +0.16, -0.03]` | `[-0.32, -0.02, +0.08]` / `0.52` / `-0.20` | `[-0.32, -0.04, -0.10]` / `0.58` / `+0.08` | Hips uncoil toward net (`-0.22`) ahead of chest (`+0.16`) |
| `0.07` | Contact | `+0.18` | `[+0.10, -0.26, 0.00]` | `[+0.10, -0.14, +0.04]` | `[-0.30, +0.04, +0.06]` / `0.48` / `-0.18` | `[-0.26, -0.12, -0.08]` / `0.58` / `+0.25` | Front (`rLeg`) braces; balance arm (`bUp`) extends back for counterbalance |
| `0.28` | Follow-Through | `-0.28` | `[+0.08, -0.28, +0.02]` | `[+0.08, -0.26, +0.05]` | `[-0.26, +0.06, +0.05]` / `0.44` / `-0.18` | `[-0.24, -0.20, -0.06]` / `0.62` / `+0.42` | Rear (`bFoot: +0.42`) heel lifts; full one-handed extension & counter-arm spread |
| `0.55` | Recovery | `0.00` | `[0, 0, 0]` | `[0, 0, 0]` | `[0, 0, 0]` / `0` / `0` | `[0, 0, 0]` / `0` / `0` | Return to ready pose |

### `overhead` (Bandeja / Víbora / Rulo)
| `t` (s) | Phase | `yaw` | `hips` | `chest` | `rLeg` (`rThigh` / `rCalf` / `rFoot`) | `bLeg` (`bThigh` / `bCalf` / `bFoot`) | Notes |
|---|---|---|---|---|---|---|---|
| `0.00` | Trophy (`PREP.overhead`) | `-0.85` | `[-0.04, -0.18, +0.03]` | `[-0.10, -0.22, +0.10]` | `[-0.38, -0.10, +0.15]` / `0.62` / `-0.24` | `[-0.35, +0.06, -0.12]` / `0.58` / `-0.23` | Side-on trophy stance, balance hand (`bUp`) pointing at ball |
| `0.04` | Controlled Hip Turn | `-0.50` | `[+0.02, +0.16, +0.01]` | `[-0.04, -0.16, +0.06]` | `[-0.30, +0.02, +0.10]` / `0.52` / `-0.06` | `[-0.30, +0.04, -0.08]` / `0.50` / `-0.20` | Controlled hip opening (`+0.16`) while chest stays side-on |
| `0.08` | Contact | `-0.15` | `[+0.06, +0.20, 0.00]` | `[+0.04, +0.14, -0.04]` | `[-0.24, +0.08, +0.08]` / `0.50` / `+0.18` | `[-0.28, 0.00, -0.06]` / `0.46` / `-0.18` | Controlled slice/tray strike at shoulder-to-head height |
| `0.28` | Follow-Through | `+0.38` | `[+0.10, +0.24, -0.01]` | `[+0.12, +0.22, -0.06]` | `[-0.22, +0.16, +0.06]` / `0.56` / `+0.34` | `[-0.26, -0.04, -0.05]` / `0.44` / `-0.18` | Smooth across-body finish with rear heel pivot (`rFoot: +0.34`) |
| `0.55` | Recovery | `0.00` | `[0, 0, 0]` | `[0, 0, 0]` | `[0, 0, 0]` / `0` / `0` | `[0, 0, 0]` / `0` / `0` | Return to ready pose |

### `smash` (Power Smash / Bajada)
| `t` (s) | Phase | `yaw` | `hips` | `chest` | `rLeg` (`rThigh` / `rCalf` / `rFoot`) | `bLeg` (`bThigh` / `bCalf` / `bFoot`) | Notes |
|---|---|---|---|---|---|---|---|
| `0.00` | Trophy (`PREP.overhead`) | `-0.85` | `[-0.04, -0.18, +0.03]` | `[-0.10, -0.22, +0.10]` | `[-0.38, -0.10, +0.15]` / `0.62` / `-0.24` | `[-0.35, +0.06, -0.12]` / `0.58` / `-0.23` | Deep coiled load (`pelvisY: 0.59m`) |
| `0.03` | Explosive Leg Extension | `-0.35` | `[-0.04, +0.30, 0.00]` | `[-0.12, -0.14, +0.08]` | `[-0.16, +0.06, +0.08]` / `0.30` / `+0.22` | `[-0.14, +0.02, -0.06]` / `0.22` / `-0.06` | Knees extend sharply (`pelvisY: 0.73m`), hips fire `+0.30` |
| `0.07` | High-Point Contact | `-0.08` | `[+0.06, +0.36, 0.00]` | `[+0.06, +0.32, -0.08]` | `[-0.12, +0.12, +0.06]` / `0.26` / `+0.32` | `[-0.10, 0.00, -0.05]` / `0.16` / `-0.04` | Full upward extension onto toes (`pelvisY: 0.77m`), chest & arm fully open |
| `0.26` | Crunch & Rear-Leg Kick | `+0.55` | `[+0.18, +0.38, -0.02]` | `[+0.22, +0.36, -0.10]` | `[-0.46, +0.20, +0.04]` / `0.74` / `+0.46` | `[-0.30, -0.08, -0.06]` / `0.50` / `-0.20` | Torso crunches forward/down (`spine: +0.38`), rear leg drives forward (`rFoot: +0.46`) |
| `0.55` | Recovery | `0.00` | `[0, 0, 0]` | `[0, 0, 0]` | `[0, 0, 0]` / `0` / `0` | `[0, 0, 0]` / `0` / `0` | Return to ready pose |

### `volleyF` & `volleyB`
| Stroke | `t` (s) | `yaw` | `hips` | `chest` | `rLeg` (`rThigh` / `rCalf` / `rFoot`) | `bLeg` (`bThigh` / `bCalf` / `bFoot`) | Notes |
|---|---|---|---|---|---|---|---|
| `volleyF` | `0.00` | `-0.38` | `[+0.03, -0.10, +0.02]` | `[+0.03, -0.12, +0.03]` | `[-0.21, -0.04, +0.08]` / `0.34` / `-0.13` | `[-0.19, +0.03, -0.05]` / `0.32` / `-0.13` | Compact `half('forehand')` split-step prep |
| `volleyF` | `0.03` | `-0.22` | `[+0.08, +0.12, +0.02]` | `[+0.06, -0.08, +0.02]` | `[-0.34, +0.02, +0.10]` / `0.58` / `-0.12` | `[-0.36, +0.04, -0.08]` / `0.58` / `-0.22` | Compact step-in knee bend, short hip turn |
| `volleyF` | `0.06` | `-0.08` | `[+0.10, +0.16, +0.01]` | `[+0.08, +0.10, -0.02]` | `[-0.30, +0.05, +0.08]` / `0.58` / `+0.12` | `[-0.36, 0.00, -0.06]` / `0.56` / `-0.20` | Punch block in front of body |
| `volleyF` | `0.25` | `+0.06` | `[+0.08, +0.18, 0.00]` | `[+0.06, +0.14, -0.02]` | `[-0.28, +0.08, +0.06]` / `0.56` / `+0.20` | `[-0.32, -0.02, -0.05]` / `0.50` / `-0.18` | Controlled short follow-through |
| `volleyB` | `0.00` | `+0.47` | `[+0.03, +0.10, -0.02]` | `[+0.03, +0.13, -0.03]` | `[-0.19, -0.03, +0.05]` / `0.32` / `-0.13` | `[-0.21, +0.04, -0.08]` / `0.34` / `-0.13` | Compact `half('backhand')` prep |
| `volleyB` | `0.03` | `+0.32` | `[+0.08, -0.12, -0.02]` | `[+0.06, +0.08, -0.02]` | `[-0.36, -0.04, +0.08]` / `0.58` / `-0.22` | `[-0.34, -0.02, -0.10]` / `0.58` / `-0.12` | Step across with front (`rLeg`) knee flexed |
| `volleyB` | `0.06` | `+0.16` | `[+0.10, -0.16, -0.01]` | `[+0.08, -0.10, +0.02]` | `[-0.36, 0.00, +0.06]` / `0.56` / `-0.20` | `[-0.30, -0.05, -0.08]` / `0.58` / `+0.12` | Firm backhand block, balance arm spreads back |
| `volleyB` | `0.25` | `+0.02` | `[+0.08, -0.18, 0.00]` | `[+0.06, -0.14, +0.02]` | `[-0.32, +0.02, +0.05]` / `0.50` / `-0.18` | `[-0.28, -0.08, -0.06]` / `0.56` / `+0.20` | Controlled finish |

### `SERVE_READY` / `SERVE_BACK` / `SERVE_SWING` (Underhand Padel Serve)
| Phase / `t` (s) | `yaw` | `hips` | `chest` | `rLeg` (`rThigh` / `rCalf` / `rFoot`) | `bLeg` (`bThigh` / `bCalf` / `bFoot`) | Notes |
|---|---|---|---|---|---|---|
| `SERVE_READY` | `-1.15` | `[+0.05, -0.14, +0.03]` | `[+0.04, -0.14, +0.04]` | `[-0.34, -0.06, +0.12]` / `0.58` / `-0.24` | `[-0.32, +0.05, -0.08]` / `0.55` / `-0.23` | Side-on stance, knees flexed, ball held out, head looking at receiver (`head[1]: +0.42`) |
| `SERVE_BACK` (`0.00`) | `-0.55` | `[+0.12, -0.18, +0.04]` | `[+0.10, -0.18, +0.05]` | `[-0.46, -0.08, +0.14]` / `0.74` / `-0.28` | `[-0.42, +0.06, -0.10]` / `0.68` / `-0.26` | Deep crouch (`pelvisY: 0.57m`) as ball drops and racket swings back low |
| `0.03` | `-0.35` | `[+0.10, +0.18, +0.02]` | `[+0.10, -0.12, +0.03]` | `[-0.34, +0.04, +0.08]` / `0.60` / `+0.06` | `[-0.34, +0.02, -0.08]` / `0.54` / `-0.20` | Upward leg drive & hip rotation prior to waist-level strike |
| `0.08` (Contact) | `-0.15` | `[+0.10, +0.24, +0.01]` | `[+0.08, +0.14, -0.04]` | `[-0.26, +0.10, +0.08]` / `0.56` / `+0.24` | `[-0.30, -0.04, -0.06]` / `0.48` / `-0.18` | Waist-high underhand contact, weight transferred to front leg |
| `0.36` (Follow) | `+0.25` | `[+0.06, +0.26, -0.01]` | `[+0.06, +0.20, -0.05]` | `[-0.22, +0.16, +0.06]` / `0.58` / `+0.38` | `[-0.26, -0.04, -0.05]` / `0.44` / `-0.18` | Low-to-high follow-through, rear heel lifted (`rFoot: +0.38`) |
| `0.55` (End) | `0.00` | `[0, 0, 0]` | `[0, 0, 0]` | `[0, 0, 0]` / `0` / `0` | `[0, 0, 0]` / `0` / `0` | Recovery to ready stance |

---

## 4. Locomotion Blending & Constraints
- When moving (`cur === 'run'` or `cur === 'walk'`), leg pose offsets (`rThigh`, `rCalf`, `rFoot`, `bThigh`, `bCalf`, `bFoot`) are scaled by `legW = cur === 'run' ? 0.35 : cur === 'walk' ? 0.6 : 1` so procedural knee bend blends with the running/walking cycle without locking the legs, while upper-body stabilization (`steady` slerp to `idleQuats` for `spine_02`, `spine_03`, `neck_01`, and arms) remains intact.
- Preserved all `agy-07` slow-motion fixes (`localSwingT`, `lastRawSwingT`, `moved` ball check, `ballStepDt`).
- Zero new per-frame object allocations in `update()`.

## 5. Known Issues / Notes
- Because the underlying `Sword_Idle` clip in `UAL1_Standard.glb` is authored slightly right-handed (pelvis rotated `~12°` in rest clip), `PREP` poses include a small coronal hip roll (`hips[2] ≈ ±0.03..0.04`) and spine counter-roll (`spine[2] ≈ ∓0.04..0.05`) so that both feet rest within `≤1 cm` of the floor for both right-handed and left-handed avatars.


---

## Opus İncelemesi

- **Hata (düzeltildi):** `pelvis`, `foot_*` gibi bekleme klibinde sabit duran kemiklerde AnimationMixer değeri yeniden yazmıyor; poz ofsetleri kare kare birikiyor ve karakter yere yığılıyordu (ölçüm: vuruşta kafa 1.45 m → −0.06 m). `player.js`'te poz verilen kemikler her karede `mixer.update` öncesi son klip değerine döndürülüyor (`posed` / `clipQ`).
- **Ayar:** Bacak anahtar kareleri tam güçte kalçayı ~18 cm indiriyor ve dizleri içe kapatıyordu; `LEG_DEPTH = 0.55` kalibrasyon düğmesi eklendi.
- **Açık:** Forehand temasında dizler hâlâ hafif içe kapanıyor (`rThigh`/`bThigh` y/z değerleri). Rapordaki "görsel doğrulandı" iddiası tutmuyordu; sonraki poz işlerinde ekran görüntüsü zorunlu.
