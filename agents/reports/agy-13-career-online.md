# agy-13 Rapor: Kariyerde online lobi (Claude Sonnet)

## Değişen dosyalar
`src/main.js`, `src/careerui.js`. (index.html'e dokunulmadı; mevcut `.cr-*`/`.pl-*` stilleri kullanıldı.)

## main.js
- `export function startOnline({url, code, players, venue, ai, match, char, stats, racket, public, name, look, shoes, ball, onEnd, status})`: eski `$('online').onclick` gövdesi. GitHub Pages ("requires a game server") mesajı ve boş kod kontrolü içeride aynı sırayla. `url` verilmezse eski mantık (`?server=`, 5173 → `:8080`, aksi halde aynı host). `status(text, lobby)` callback'i `#lobby` metnini kariyer panelinde yansıtmak için; net handle döner.
- Eski menü butonu menü alanlarını toplayıp `startOnline`'ı çağırır.
- Uzak oyuncular: `roster[id] = {...characters[chars[id]], ...look(stats hariç), name: names[id]}`.
- Online bitiş: `handleEvents` içinde `onEnd && net` dalı, bir kez `{won, gamesWon (net.score.board.sets içinden kendi takımın), pointsWon (nokta olaylarından sayılan), scoring:'sets', ai:'online', style, score}` çağırır; sonra `onEnd` boş fonksiyona çevrilir, Enter/Start mevcut `toMenu()` ile `#career`'a döner.
- `initCareer({ startMatch, startOnline })`.

## careerui.js
- Hub'a "Play Online" kartı, ekran `online` → `renderOnlineScreen()`: public oda listesi (`listRooms`, Refresh, host adı, oyuncu sayısı, mekan, boş koltuk, Join), Create room (Doubles/Singles, Public/Private, venue, sahip olunan toplardan top), Join by code. Yardımcılar: `onlineUrl`, `refreshRooms`, `joinOnlineRoom`, `leaveOnline`, `setOnlineStatus`.
- Gönderilenler: `name`, `look` (buildEquippedPlayer'dan stats çıkarılmış: outfit/headwear dahil), `stats`, kuşanılmış raket `stats`'ı, `shoes`, `ball` (yalnız kurarken), `char: 0`.
- Katıldıktan sonra lobi durumu panelde; "START MATCH" butonu `net.start()` çağırır. Maç sonu `matchReward` (×1.2) + `applyReward` + `lastReward` → ödül ekranı.
- Odadan çıkış (Leave/Esc): bağlantı varsa soketi kapatıp `#career` ile sayfayı yeniler (main.js'teki net durumunu temizlemek için).

## Doğrulama
- `npm test`: 73 pass. `npx vite build`: temiz.
- `npm run server` kısa süre çalıştırıldı; node `ws` ile bir istemci public oda kurup (name/look/cfg) diğer bağlantı `{type:'list'}` gönderdi: `rooms` cevabında oda, host adı, venue ve free=3 görüldü. Sunucu durduruldu.
- Tarayıcıda iki sekmeyle görsel doğrulama YAPILMADI (uzak oyuncu görünümü, ödül ekranı, START akışı denenmedi).

## Bilinen eksikler / belirsizlikler
- Kod doğrusal okumayla yazıldı; online sonuç `net.score.board.sets` yapısına dayanıyor (rules.scoreText ile aynı), canlı denenmedi.
- Join by code var olmayan koda girerse yeni (private) oda açar (sunucu davranışı).
- Mevcut AI seviyesi online için sabit 'club' (boş koltuklar).

---

## Opus incelemesi (17 Ekim 2026)

Not: agy kotası dolduğu için Sonnet alt-ajanı yaptı.

Doğrulandı (`node server/server.js 8080` + tarayıcı + ikinci oyuncu olarak node `ws` istemcisi): kariyer → Play Online → public oda (YOKU) kuruldu; ikinci istemcinin `list` cevabı `{code:'YOKU', players:4, venue:0, free:3, host:'Bihter'}`; ikinci oyuncu `name: 'Kemal'` ve kırmızı saç / tam sakal / mor forma `look`'u (+ hileli `stats.speed: 99`) ile katıldı → START → tarayıcıda koltuk 2 "Kemal", mor forma, kırmızı saç/sakal görünüyor; `stats` look'tan alınmadı (speed 7 = taban karakter). 4 avatar, konsol hatası yok. `npm test` 73/73, build temiz.

Canlı doğrulanmadı: online maç sonu ödülü (skoru sunucu belirler) — kod okundu: `net.score.board.sets` sunucudaki `scoreText().board` ile aynı şekil; `ai:'online'` → ×1.2.

Küçük, ertelenen: odaya girdikten sonra "Create room"/"Join" formları görünür kalıyor; uzak oyuncuların raket rengi kuşanılmış raket değil koltuk sırasına göre.
