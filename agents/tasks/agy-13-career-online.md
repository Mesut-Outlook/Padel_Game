# Görev agy-13: Kariyerde online lobi

Sen Antigravity ajanısın; Claude Opus reviewer. Plan Task 12. `src/careerui.js`, `src/main.js`, `index.html`.
İzinli komutlar: `ls cat find node "npm test" "npx vite build" wc sed`. Commit ATMA. Rapor: `agents/reports/agy-13-career-online.md`.

## Hazır (değiştirme)
- Sunucu (`server/server.js`): `{type:'list'}` → `{type:'rooms', rooms:[{code, players, venue, free, host}]}` (public, başlamamış, boş koltuklu). `join` ek alanları: `public`, `name` (≤16), `look` (≤2048 byte JSON yoksa düşer), `shoes {speed, agility}`, `ball {speed, bounce}` (yalnız odayı kuran). Lobby mesajı: `looks {seat: look}`, `names {seat: name}`.
- `src/net.js`: `connect({ url, code, cfg, char, stats, racket, onLobby, onError, ...extra })` — extra (`public, name, look, shoes, ball`) join'e eklenir. `listRooms(url)` → Promise<rooms> (4 sn'de reddeder).

## Yapılacaklar
- `main.js`: `$('online').onclick` gövdesini `export function startOnline({ url, code, players, venue, ai, match, char, stats, racket, public, name, look, shoes, ball, onEnd })`'e taşı; eski menü butonu aynı davranışla bunu çağırsın. Uzak oyuncular: `roster[id] = l.looks[id] ? { ...characters[l.chars[id] ?? 0], ...l.looks[id] } : characters[...]` (look'ta `stats` olsa bile kullanma). İsim etiketi `l.names[id]` varsa onu kullan. Online maç bitince (`net.winner != null` ilk kez) `onEnd` varsa bir kez çağır: `{ won: net.winner === teamOf(net.seat), gamesWon: <kendi takımının set oyunları toplamı>, pointsWon: <sayabildiğin kadar, yoksa 0>, scoring: 'sets', ai: 'online' }`; sonra Enter/Start `#career`'a döner (offline `toMenu` mantığı).
- Sunucu URL'si: mevcut mantık (`?server=` parametresi, 5173 portunda `ws://host:8080`, diğer durumda aynı host). GitHub Pages statik yapısında bugünkü "requires a game server" mesajı aynen kalır.
- **careerui → Play Online** (hub'a kart): oda listesi (Refresh; satır: host adı, 2/4 oyuncu, mekan, boş koltuk, Join), **Create room** (public/private, singles/doubles, venue, top seçimi = sahip olunan toplar), **Join by code**. Gönderilenler: `name: profile.player.name`, `look: profile.player` (outfit kit renkleriyle, headwear dahil — stats YOK), `stats: profile.stats`, `racket` = kuşanılmış raketin `stats`'ı, `shoes`, `ball` (yalnız kurarken). Maç sonu ödül: `matchReward(result, eco)` (`ai:'online'` → ×1.2) + `applyReward`, `lastReward` ile ödül ekranı.

## Doğrulama
- `npm test` yeşil, `npx vite build` temiz.
- `npm run server` + iki sekme: biri public oda kurar, diğeri listeden katılır, ikinci oyuncunun saç/sakal/kıyafeti diğer sekmede doğru görünür.
