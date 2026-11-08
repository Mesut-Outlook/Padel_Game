# agy-32 — "This game has ended" ve "Nobody came — reopen?"

**Veren:** Claude Opus, 2026-11-08. **Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md`, "İnceleme sonrası netleştirilenler" → "Davet edilen arkadaş". **Önce:** agy-31 bitmiş ve commit edilmiş olmalı; onun `#leftCard` kartını ve giriş fonksiyonunu yeniden kullan. **Dal:** `main`. Commit ya da push yapma.

## Durum (kodda)
- `playNow({ players, mode, invite, code })` (`src/main.js`) bir oda açar ya da odaya girer. Oda beklerken yerel bir ısınma maçı oynar. Bekleyen bağlantı `pend` değişkeninde durur.
- Sunucu hataları `startOnline()` içindeki `onError` ile gelir. `pend === me` ise bugün yalnızca `flash(t(e), 4)` gösterilir ve ısınma sürer.
- İlgili sunucu metinleri (`NET_TEXTS`, `src/net.js`): `'Room not found'`, `'Room is full or match already started'`, `'Connection closed'`. Lobi zaman aşımında (`lobbyMs`, 15 dk) sunucu soketi kapatır, istemci `'Connection closed'` görür.

## Yapılacak
1. **Davet linkiyle gelen ve oda yok/dolu:** `pend` bir `code` ile açıldıysa ve hata `Room not found` ya da `Room is full or match already started` ise kart göster: başlık `This game has ended.`, düğmeler **PLAY NOW** (aynı tür, `playNow({ players: 2 })` ya da hatırlanan `getQuickPick()`) ve **Keep warming up** (kartı kapatır, ısınma sürer).
2. **Kimse gelmedi:** `pend` açıkken bağlantı kapanırsa (`Connection closed`) ve maç başlamadıysa kart göster: başlık `Nobody came.`, düğmeler **Reopen** (aynı ayarlarla yeni `playNow`; davet odasıysa yeni linki de paylaşır, `onInvite` ile aynı yol) ve **Keep warming up**.
3. Kart açıkken ısınma maçı durur mu? Durmasın, `#leftCard` gibi. Klavye ve kumanda ile seçilebilsin.
4. Bunun için `main.js`'te `playNow`'ı ve `initHome` içindeki davet kodunu küçük bir yardımcıya taşıyabilirsin (`reopen(last)`). Son kullanılan seçenekleri bir değişkende tut.
5. Yeni metinler `t()` ile, 7 tabloda: `This game has ended.`, `Keep warming up`, `Nobody came.`, `Reopen`. Türkçe: "Bu maç sona erdi.", "Isınmaya devam et", "Kimse gelmedi.", "Yeniden aç". `PLAY NOW` zaten var. Sonra `node tools/extract-keys.js`.
6. Test: hangi hatanın hangi kartı açtığını seçen saf bir fonksiyon yaz (`roomEndCard(err, { code, started })` → `'ended' | 'nobody' | null`) ve onu test et.

## Kurallar
- Komutlar: `ls`, `cat`, `find`, `grep`, `node`, `npm test`, `npx vite build`, `wc`, `sed`.
- `npm test` ve `npx vite build` geçmeli.
- `server/`, `src/net.js`, `src/game.js`, `physics.js`, `rules.js`, `ai.js` dosyalarına dokunma. `confirm/alert/prompt` yok, `backdrop-filter` yok, isimler `textContent` ile gösterilir.

## Rapor
`agents/reports/agy-32-room-ended.md`: değişen dosyalar ve fonksiyonlar, test çıktısı, ne denediğin (yerel sunucu: `node server/server.js 8080`, sayfa `?server=ws://localhost:8080`). Denemediysen açıkça yaz.
