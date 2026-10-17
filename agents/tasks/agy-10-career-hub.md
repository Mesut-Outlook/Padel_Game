# Görev agy-10: Kariyer ekranları (hub, karakter yaratıcı, profil, ödül)

Sen Antigravity ajanısın; Claude Opus reviewer. Bu, `docs/superpowers/plans/2026-10-17-career-mode.md` planının **Task 3**'ü. Spec: `docs/superpowers/specs/2026-10-17-career-mode-design.md` §4.1–4.4.
İzinli komutlar: `ls cat find node "npm test" "npx vite build" wc sed`. Commit ATMA — Opus inceleyip commitler.

## Hazır olanlar (değiştirme, kullan)
- `src/career.js`: `PROFILE_KEY`, `newProfile(template, look)`, `loadProfile(storage)` → `{profile, status: 'ok'|'none'|'corrupt'|'unavailable'}`, `saveProfile(storage, p)` → bool, `exportProfile(p)` → string, `importProfile(text)` (hata: `Error('invalid profile')`), `matchReward(result, eco)` → `{lines:[{label,credits}], mult, credits}`, `applyReward(profile, reward, result)` → yeni profil.
- `data/economy.json` (`import eco from '../data/economy.json'`).
- `src/main.js`: `export async function startMatch(cfg)` — `cfg = { players: 2|4, humans: 1, ai, match, roster: {id: Character}, rackets: {id: racket}, venue, onEnd }`. Oyuncu id'leri: tekler `[0, 2]`, çiftler `[0, 2, 1, 3]` (0 = sen, 1 = partnerin, 2/3 = rakipler). `onEnd(result)` maç bitince bir kez çağrılır: `{won, gamesWon, pointsWon, scoring:'sets', ai, score}`. Sonra oyuncu Enter/Start'a basınca sayfa `#career` hash'iyle yeniden yüklenir.
- Menü önizlemesi: `src/menu.js` içindeki `pl-preview-canvas` + `createAvatar(scene, ch, color, shape)` (`src/player.js`). Yeni 3D sahne AÇMA (Intel HD 620) — aynı önizleme yaklaşımını/fonksiyonunu yeniden kullan (gerekirse menu.js'den küçük bir export çıkar).

## Bağlantı
- Yeni dosya `src/careerui.js`: `export function initCareer({ startMatch })` ve `export function openCareer()`.
- `main.js` içinde `initMenu();` satırından sonra, `startMatch` tanımlandıktan sonra çalışacak şekilde `initCareer({ startMatch })` çağır (careerui main.js'i import etmesin — döngüsel import olmasın).
- `initCareer` `location.hash === '#career'` ise kariyeri otomatik açar.
- `src/menu.js` üst barına (`.pl-topbar` / `.pl-top-right`) **CAREER** butonu → `openCareer()`.
- Stil `index.html`'de, mevcut `.pl-*` görünümüne uyumlu (aynı renkler, kart, buton stilleri). Tüm metinler İngilizce.

## Depolama
- `localStorage` erişimi her zaman `career.js` fonksiyonları üzerinden (`loadProfile/saveProfile`), hiç doğrudan `localStorage.getItem` çağırma; `localStorage`'a erişim bile throw edebilir → `let store; try { store = localStorage; } catch { store = memory stub }`.
- Bu not (birebir) ilk açılışta "Create" altında ve Profile ekranında görünür: **"Your progress is saved in this browser only. Clearing browser data deletes it. Accounts are coming later."**
- `status: 'unavailable'` veya `saveProfile` false dönerse: üstte banner "Storage is blocked in this browser — progress will be lost when the page reloads." Kariyer yine açılır (bellekte profil).
- `status: 'corrupt'`: banner "Your saved profile could not be read." + **Start new** / **Import** butonları. Asla crash yok.

## Ekranlar
1. **No profile** → 26 karakterden şablon seçimi (kart ızgarası, bayrak + isim) → yaratıcı.
2. **Creator** (Create ve sonradan Profile → Edit look, ücretsiz; statlara dokunmaz). Alanlar `characters.json` şemasıyla aynı, `createAvatar` değişmeden çalışmalı:
   - `name` (1–16 karakter, boşsa Create pasif), `country` + `countryCode` (karakterlerdeki ülkelerden seçim), `gender` (şablondan, değiştirilemez), `hand` (`right|left`).
   - `skinTone` (6–8 hazır ton + renk input), `body.type` (`slim|athletic|muscular|stocky|tall|petite`) ve `body.height` (0.9–1.1 slider), `body.width` karakterlerdeki tipe göre; `face.width` (0.9–1.12 slider).
   - Saç `hair`: `Hair_SimpleParted`, `Hair_Buzzed`, `Hair_BuzzedFemale`, `Hair_Long` (+ `hairCut` slider; kısa küt kesim, `undefined` = uzun), `Hair_Buns`, `none`; ek bayraklar `ponytail` (bool), `topknot` (bool).
   - `hairColor`: renk input + 8 hazır ton (siyah, koyu kahve, kahve, kestane, kızıl, sarı, kül, gri).
   - `beard`: `none|stubble|full|goatee` (`none` → alanı sil/null), `beardColor` (aynı paletler).
   - `glasses`: yok / renk (true yerine renk string'i desteklenir), `makeup` (bool), `headwear`: yok / `{type:'headband'|'visor', color}`.
   - Canlı 3D önizleme her değişiklikte güncellenir (debounce ~150 ms; eski avatar `dispose`).
   - Create → `newProfile(template, look)` → `saveProfile` → Hub.
3. **Hub**: profil kartı (önizleme, isim, bayrak, **Credits**, **Ranking points**, "World rank: —"), kartlar: **Play**, **Tournaments** (pasif, "Coming soon"), **Training** / **Shop** / **Locker** (pasif), **Ranking** (pasif), **Profile**, ve **Back to menu** (kariyeri kapatıp normal menüye döner, hash'i temizler).
4. **Play**: Singles / Doubles, AI level (`rookie|club|pro|legend` — çarpanı göster: ×0.6 ×1 ×1.4 ×1.8), venue, çiftlerde partner seçimi (karakterlerden). Maç: 1 set, 6 oyun, golden point → `match: { sets: 1, superTiebreak: false, goldenPoint: true, starPoint: false }`.
   - Roster: `0 = { ...profile.player, stats: profile.stats }`, raket `rackets.find(r => r.id === profile.equipped.racket)`; rakipler/partner karakterlerden rastgele (partner seçildiyse o), rastgele raket.
   - `onEnd(result)`: `reward = matchReward(result, eco)`, `p = applyReward(profile, reward, result)`, `p.lastReward = { lines: reward.lines, mult: reward.mult, credits: reward.credits, won: result.won, score: result.score.sets }`, `saveProfile`.
5. **Reward screen** (hub açılırken `profile.lastReward` varsa): WIN/LOSS başlığı, skor, kalem kalem satırlar (`Played +20`, `6 games × 4 +24`, `Win +40`), AI çarpanı satırı (`Pro ×1.4`), toplam `+118 Credits`, yeni bakiye. Continue → `lastReward` silinir, kaydedilir, Hub.
6. **Profile**: Edit look, **Export** (`padel-career.json` indirir — Blob + `a[download]`), **Import** (file input → `importProfile`; hata → kırmızı mesaj, profil değişmez), storage notu, **Delete profile** (sayfa içi onay: "Type DELETE" veya ikinci buton; `confirm()` YASAK) → `try { localStorage.removeItem(PROFILE_KEY) } catch {}` → No profile ekranı.

## Navigasyon
Mevcut menü gibi: fare, klavye (ok tuşları/Tab, Enter seç, Esc geri), Xbox (D-pad/sol çubuk hareket, A seç, B geri). Odaklanan eleman belirgin olsun.

## Doğrulama (rapora yaz)
- `npm test` yeşil, `npx vite build` temiz.
- Tarayıcıda: profil oluştur → Play → (konsoldan hızlı bitirebilirsin: `__padel().world.match.sets=[[5,0]]; __padel().world.match.points=[3,0]`) maç sonu Enter → Reward ekranı → Credits arttı → sayfayı yenile, Credits kaldı.
- `localStorage.setItem('padel.career.v1','{bad')` → corrupt banner, crash yok.
- Rapor: `agents/reports/agy-10-career-hub.md` (yapılanlar, değişen dosyalar, bilinen eksikler). "Görsel doğrulandı" deme — Opus kendisi bakacak.
