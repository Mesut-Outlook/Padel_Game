// Who a player can pick (pure: no DOM, no three). data/characters.json keeps every character in its first order, because
// online seats and saved picks send array indices; archived ones are hidden from pickers but stay for career AI and old saves.
export const isActive = (c) => !c?.archived;
export const activeIndices = (list) => list.flatMap((c, i) => (isActive(c) ? [i] : []));

// a saved or sent index that points at an archived (or missing) character becomes a random pickable one
export function resolvePick(idx, list, rnd = Math.random) {
  if (Number.isInteger(idx) && isActive(list[idx]) && list[idx]) return idx;
  const act = activeIndices(list);
  return act[Math.floor(rnd() * act.length)] ?? 0;
}

// a character's stance (data: stance.idle) -> the clip it stands in (public/assets/anims/UAL1_Standard.glb)
export const STANCE_CLIPS = { ready: 'Sword_Idle', relaxed: 'Idle_Loop', talk: 'Idle_Talking_Loop' };

// portrait cache key includes stance so a yaw/idle change renders a fresh card
export function portraitKey(ch) {
  const s = ch?.stance;
  return `char:${ch?.id}:${s?.yaw || 0}:${s?.idle || 'ready'}`;
}

// the character an empty online seat (played by the AI) shows: a fixed active player per seat
export function aiSeatChar(id, list) {
  const act = activeIndices(list);
  return act[(id * 3 + 1) % act.length] ?? 0;
}
