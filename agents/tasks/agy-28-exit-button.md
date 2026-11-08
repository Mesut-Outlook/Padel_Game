# agy-28 — ✕ Exit düğmesi ve "Leave the match?" penceresi

**Veren:** Claude Opus, 2026-11-08. **Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md`, hedef 4 ve "✕ Exit her yerde" (oku). **Dal:** `main` üzerinde çalış. Commit ya da push yapma, dal değiştirme.

## Neden
Telefonda maçtan çıkış bulunamadı. Çıkış her zaman görünür olmalı ve oyunun kendi penceresiyle sorulmalı. Tarayıcının `confirm` kutusu kullanılmayacak.

## Durum (kodda)
- Duraklatma menüsü `src/main.js` içinde: `pauseItems()`, `drawPause()`, `setPaused(on)`, `pauseInput()`. HTML'i `index.html` içinde `<div id="pause">` (`.pz-card`, `.pz-title` = "PAUSED"). Offline maç durur, online maç arkada sürer (`net`).
- Maçtan çıkış `toMenu()` (`src/main.js`): kariyer maçında hükmen yenilgi sonucunu (`forfeit: true`) `onEnd`'e verir ve `#career`'e döner, diğerleri `#friendly`'ye.
- Skor tablosu `#hud` sol üstte (`index.html`, `#hud { position: fixed; top: 10px; left: 10px; … }`).
- Dokunmatik üst çubuk `TOP` (`src/touch.js` satır 26) içinde `['Escape', '⏸', N_('Pause')]` var.

## Yapılacaklar
1. **Düğme:** maç sırasında (offline, online, Training, kariyer) sol üstte her zaman görünen, yazılı, beyaz bir **✕ Exit** düğmesi (`<button id="exitBtn">`). Menüde, ana sayfada ve kariyer ekranlarında görünmez. Telefonda dokunmak kolay olsun (en az 44×44 px). Skor tablosu (`#hud`) düğmenin altına kayar, üst üste binmez. `body.touch` ve masaüstü, ikisinde de kontrol et.
2. **Pencere:** düğmeye basmak, Esc ve kumandanın Start/Options tuşu aynı pencereyi açar. Bugünkü duraklatma penceresini dönüştür, ikinci bir pencere yazma:
   - Başlık: `Leave the match?`
   - Seçenekler sırayla: `Keep playing` (seçili gelir), offline ise `Restart match` (bugünkü gibi), Training'de `Skip lesson` (bugünkü gibi), `Fullscreen` / `Exit Fullscreen` (bugünkü gibi), en sonda `Leave`.
   - Kariyer maçında (`onEnd` var) başlığın altında `Leaving counts as a loss.` yazar.
   - Offline maç pencere açıkken durur, online maç durmaz (bugünkü davranış, `pzNote` metni kalır).
   - Klavye, kumanda ve dokunma ile seçim bugünkü gibi çalışır (`pauseInput()`).
3. **Leave:** `toMenu()` çağırır. Kariyer maçı bugünkü gibi `#career`'e döner (hükmen yenilgi kuralı değişmez). Friendly, online ve Training artık `#home`'a döner (`#friendly` yerine). Online maçta mevcut ayrılma yolu (`net` kapanışı) korunur; `toMenu()` içinde bugün nasıl kapanıyorsa öyle kalsın.
4. **Dokunmatik:** `TOP` içindeki ⏸ kalkar. Esc eylemi artık ✕ Exit düğmesinde. `.tc-tips` koç işaretlerinde ⏸ anlatılıyorsa onu ✕ Exit'e çevir.
5. **Metinler:** yeni metinler `t('…')` ile: `Leave the match?`, `Keep playing`, `Leave`, `Leaving counts as a loss.`, `✕ Exit` (ya da düğmede ✕ ikonu ayrı, yazı `t('Exit')`). Hepsini 7 tabloya ekle (`src/locales/de.js es.js fr.js it.js nl.js pt.js tr.js`). Türkçe: "Maçtan çıkılsın mı?", "Oynamaya devam et", "Çık", "Çıkmak yenilgi sayılır.", "Çıkış". Kullanılmayan eski anahtarlar (`PAUSED`, `Main menu`) başka yerde kullanılmıyorsa tablolardan da sil. Sonra `node tools/extract-keys.js` çalıştır.
6. **Kontrol sayfası:** `kontroller.html` ve `src/helpkeys.js` içinde Esc / Start "pause" diye anlatılıyorsa "Exit menu" olarak düzelt (yeni metin yine `t()` ve 7 tablo).

## Kurallar
- Çalıştırabileceğin komutlar: `ls`, `cat`, `find`, `grep`, `node`, `npm test`, `npx vite build`, `wc`, `sed`.
- `npm test` ve `npx vite build` geçmeli.
- `src/game.js`, `physics.js`, `rules.js`, `ai.js` ve `server/` dosyalarına dokunma.
- `backdrop-filter` ekleme (Intel HD 620). Animasyon gerekiyorsa yalnızca `transform`/`opacity`.
- `confirm()`, `alert()` ya da `prompt()` kullanma.
- `t()` anahtarı `${}` ile kurulmaz, her anahtar tek cümle.

## Rapor
`agents/reports/agy-28-exit-button.md`:
- değişen dosyalar ve fonksiyon/kimlik adları (Opus her birini grep ile kontrol edecek),
- `npm test` ve `npx vite build` çıktısının son satırları,
- tarayıcıda ne denedin. Ekran görüntüsü aldıysan `agents/reports/agy-28/` içine koy. Alamadıysan bunu açıkça yaz; "görsel olarak doğrulandı" deme.
