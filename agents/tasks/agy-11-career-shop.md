# Görev agy-11: Training, Shop, Locker ekranları + ekipmanın maça girmesi

Sen Antigravity ajanısın; Claude Opus reviewer. Plan Task 6 (`docs/superpowers/plans/2026-10-17-career-mode.md`). agy-10'un yaptığı `src/careerui.js` üzerine kur; aynı stil ve navigasyon (fare/klavye/Xbox).
İzinli komutlar: `ls cat find node "npm test" "npx vite build" wc sed`. Commit ATMA. Rapor: `agents/reports/agy-11-career-shop.md`.

## Hazır API (`src/career.js`, değiştirme)
- `trainCost(level, eco)`, `buyTraining(profile, stat, eco)` → `{ok:true, profile} | {ok:false, reason:'max'|'credits'|'stat'}`
- `tierOf(rankingPoints, shop)`, `buyItem(profile, item, shop)` → `{ok, profile} | {ok:false, reason:'owned'|'credits'|'tier'}`, `equip(profile, slot, id)` (slot: `racket|shoes|ball|kit|headwear`; sahip olunmayan id'de profil aynen döner)
- Veri: `data/economy.json`, `data/shop.json` (`tiers`, `items` — type `shoes|ball|kit|headwear`), `data/rackets.json` (fiyat/tier/`core`/`face`/`shape`/`weightG`/`stats`).
- `startMatch(cfg)` artık `cfg.shoes = {id: {speed, agility}}` ve `cfg.ball = {speed, bounce}` alır (Opus ekledi).

## Ekranlar (hub kartlarını aktif et)
- **Training**: 6 stat (speed, power, control, volley, smash, stamina) — bar + seviye (x/10), sonraki maliyet, Buy. Pasifse nedeni yaz: `max` → "Maxed", `credits` → "Need N more Credits". Altında tek satır açıklama her stat için (ör. "Volley: accuracy on balls taken before the bounce").
- **Shop**: sekmeler Rackets / Shoes / Balls / Kit / Headwear. Kart: isim, fiyat, raketlerde power/control/spin/sweet spot barları + "Hard EVA · 18K carbon · diamond · 365 g", ayakkabıda "+7% speed · agility 18", topta "Speed ×1.06 · Bounce ×1.04", kit renk örnekleri. Kilit: "Unlocks at Regional — 60 ranking pts" (`shop.tiers`). Rozetler Owned / Equipped. Buy → `buyItem`; hata nedenini kart üstünde göster (`owned`/`credits`/`tier`). Başarıda kaydet (`saveProfile`).
- **Locker**: slot başına sahip olunanlar arasından seç (`equip`) → önizleme anında güncellenir (raket rengi/şekli, kit renkleri, başlık).
- Credits göstergesi her ekranda üstte.

## Kariyer maçına ekipman (careerui Play)
- Raket: `rackets.find(r => r.id === profile.equipped.racket)`.
- Oyuncu karakteri: `{ ...profile.player, stats: profile.stats, outfit: { shirt: kit.shirt, shorts: kit.shorts, shoes: shoeItem.color }, headwear: equipped headwear item varsa onun `headwear`'ı, yoksa profile.player.headwear }`.
- `cfg.shoes = { 0: { speed, agility } }` (equipped ayakkabı), `cfg.ball = { speed, bounce }` (equipped top).

## Doğrulama
- `npm test` yeşil, `npx vite build` temiz.
- Konsoldan Credits ver (`p.credits = 5000` + kaydet) → stat al, ayakkabı/raket/kit al → Locker'da kuşan → Play → maçta raket rengi ve kit görünür.
