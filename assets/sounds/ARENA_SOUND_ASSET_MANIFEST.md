# Arena Sound Asset Manifest

Save these files in `assets/sounds/` exactly with these names. MP3 is safest for Expo. Keep each sound short and normalized.

## Required filenames
- `arena_tap.mp3` — 40-80 ms soft UI tick.
- `arena_match_start.mp3` — 0.6-1.0 sec match launch sting.
- `arena_power_reveal.mp3` — 0.35-0.7 sec clean reveal sparkle.
- `arena_power_shield.mp3` — 0.35-0.7 sec protective shimmer.
- `arena_power_freeze.mp3` — 0.45-0.8 sec icy/time stop swell.
- `arena_shield_block.mp3` — 0.4-0.7 sec block/parry feedback.
- `arena_mistake.mp3` — 0.25-0.5 sec gentle negative tone.
- `arena_victory.mp3` — 0.9-1.5 sec premium win sting.
- `arena_defeat.mp3` — 0.6-1.1 sec soft loss tone, not harsh.
- `arena_promotion.mp3` — 1.2-2.0 sec rank-up flourish.
- `arena_badge_unlock.mp3` — 0.9-1.5 sec unlock sparkle.
- `arena_cup_champion.mp3` — 1.8-2.8 sec trophy/champion fanfare.
- `arena_reward_claim.mp3` — 0.45-0.9 sec reward bank/claim tone.

## Audio direction
- Premium mobile game, not casino, not cartoon.
- Short, clean, warm, no vocals.
- Avoid bass-heavy hits because phone speakers distort.
- Loudness target: about -16 LUFS integrated, peaks below -1 dB.
- Sample rate: 44.1 kHz.
- Bitrate: 128-192 kbps MP3.

## Haptics used in code
No files needed for haptics. The app uses `expo-haptics`:
- tap: selection
- match start / powers: medium impact
- mistake / defeat: error notification
- shield block: warning notification
- victory / promotion / badge / cup / reward: success notification

## Animation used in code
No animation files are required yet. This patch uses React Native `Animated` only.
Later, if we add Lottie/Rive, place files under `assets/animations/arena/`.
