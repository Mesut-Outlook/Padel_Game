# agy-31 — Rakip çıkınca: "Continue vs AI / Back to lobby"

**Veren:** Claude Opus, 2026-11-08. **Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md` hedef 4 (son cümleler). **Dal:** `main`. Commit ya da push yapma.

## Durum (kodda)
- Online maçta biri ✕ Exit ile çıkınca sunucu `{ type: 'left', seat, name }` gönderir. `src/net.js` bunu `onLeft({ seat, name })` ile verir. `src/main.js` `startOnline()` içinde `onLeft` bugün yalnızca `flash(t('{name} left the match. The AI plays for them.'))` gösteriyor. Sunucu o koltuğu AI'a vermiştir, maç sürer.
- Maç penceresi: `#pause` (`drawPause()`, `pauseItems()`, `setPaused()`), Exit düğmesi `#exitBtn` (agy-28).

## Yapılacak
1. `onLeft` geldiğinde, maçta **benden başka insan kalmadıysa** (`net.lobby.taken`'da yalnızca `net.seat`; lobi mesajı `left`'ten hemen sonra gelir, ikisini de dikkate al), küçük bir oyun içi kart göster (yeni `<div id="leftCard">`, `#pause` ile aynı görünüm ailesi): başlık `{name} left the match.`, iki düğme: **Continue vs AI** (kartı kapatır, maç sürer) ve **Back to lobby** (`toMenu()`).
2. Online maç durmaz (kart açıkken de). Kart açıkken klavye/kumanda: ← → ya da ↑ ↓ seç, Enter/A onay, Esc/B = Continue vs AI. `pauseInput()` desenine bak; ayrı küçük bir giriş fonksiyonu yazabilirsin.
3. Başka insanlar maçta kalıyorsa (çiftler) bugünkü `flash` yeterli, kart açılmaz.
4. Yeni metinler `t()` ile, 7 tabloda: `{name} left the match.`, `Continue vs AI`, `Back to lobby`. Türkçe: "{name} maçtan ayrıldı.", "AI'a karşı devam et", "Lobiye dön". Sonra `node tools/extract-keys.js`.
5. Test: `test/` altına küçük bir saf fonksiyon testi ekle. Örnek: `src/lobbyview.js` ya da yeni küçük bir dosyada `aloneOnline(lobby, seat)` → `true` / `false`. `main.js` onu kullansın.

## Kurallar
- Komutlar: `ls`, `cat`, `find`, `grep`, `node`, `npm test`, `npx vite build`, `wc`, `sed`.
- `npm test` ve `npx vite build` geçmeli.
- `server/`, `src/net.js`, `src/game.js`, `physics.js`, `rules.js`, `ai.js` dosyalarına dokunma. `confirm/alert/prompt` yok, `backdrop-filter` yok.
- `textContent` kullan; isim başka oyuncudan geliyor.

## Rapor
`agents/reports/agy-31-opponent-left.md`: değişen dosyalar ve fonksiyon adları, test çıktısının son satırları, ne denedin (iki sekme + `node server/server.js 8080` + `?server=ws://localhost:8080` ile denediysen yaz; denemediysen açıkça yaz).
