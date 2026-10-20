# Görev agy-24 Raporu: Skor Tablosu Sol Üst, Yardım Sağ Üst + Friendly Seçimleri Hatırlansın (`padel.friendly.v1`)

- **Ajan**: Antigravity (agy)
- **Reviewer**: Claude Opus
- **Tarih**: 2026-10-21
- **Plan Referansı**: `docs/superpowers/plans/2026-10-21-roadmap.md` maddeleri **A1** ve **A2**.

---

## 1. Yapılan Değişiklikler ve Dosyalar

### A1. Maç İçi HUD Yerleşimi
1. **`index.html`** (CSS kuralları):
   - `#hud`: `top: 10px; left: 10px;` (ekranın sol üst köşesine taşındı, `left: 50%` ve `transform: translateX(-50%)` kaldırıldı).
   - `@media (max-height: 500px)`: `#hud` için `transform: scale(.78); transform-origin: top left;` uygulandı.
   - `#cam`: `bottom: 16px; right: 16px;` (sağ üstten sağ alt köşeye taşındı, `top: 16px` kaldırıldı).
   - `body.touch:not(.pad) #cam`: Dokunmatik ekranda sanal vuruş butonlarıyla çakışmaması için `#cam` gizlendi (`display: none !important;`).
   - `#touchUi .tc-top`: `top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); left: auto;` olarak sağ üste taşındı (sol üstteki skor tablosuyla çakışması engellendi). `#touchUi .tt-top` ipucu konumu da sağ tarafa hizalandı.
   - `#help[data-pos="tl"]`: `left: 12px; top: 125px;` (kullanıcı kayıtlı konumu `tl` ise skor tablosunun altına iner).
   - `#tutorial`: `top: 125px; left: 16px;` (Training modu ders paneli sol üstteki `#hud` altına yerleşir).
   - `#help[data-pos="br"]` (`bottom: 52px; right: 12px;`) ve `body:has(#help[data-pos="tr"]:not(.collapsed):not([hidden])) #replayTag` mevcut kuralları korundu.

2. **`src/helpkeys.js`** (`mountKeyHelp`):
   - `const home = 'tr';`: Masaüstü ve dokunmatik cihazlarda varsayılan tuş yardım konumu `'tr'` (sağ üst) yapıldı (`place(p)` içinde bilinmeyen konumlar için de `'tr'` varsayılanı kullanıldı).

---

### A2. Friendly Seçimlerinin Hatırlanması (`padel.friendly.v1`)
1. **`src/friendlypicks.js`** (Yeni Saf Modül):
   - `STORAGE_KEY`: `'padel.friendly.v1'`
   - `loadPicks(storage, limits)`:
     - `char`, `venue`, `racket`, `sets`, `golden`, `ai`, `humans`, `players` alanlarını doğrular.
     - Sınır dışı indeksleri veya bilinmeyen değerleri eler.
     - Bozuk JSON, geçersiz format veya storage hatalarında boş nesne `{}` döner, asla hata fırlatmaz.
     - Tekler maçında (`players === 2`) insan oyuncu sayısını (`humans`) en fazla 2 olacak şekilde sınırlar.
   - `savePicks(picks, storage)`:
     - Verilen seçimleri JSON formatında `padel.friendly.v1` anahtarıyla kaydeder.
     - Storage kotaları veya izin hatalarında sessizce hatayı yutar, çökmez.

2. **`src/menu.js`** (`initMenu`):
   - Sihirbaz kurulmadan önce `loadPicks` ile kayıtlı seçimleri `$('char')`, `$('venue')`, `$('racket')`, `$('sets')`, `$('golden')`, `$('ai')`, `$('mode')`, `$('humans')` alanlarına yazar.
   - `selectedCharIdx`, `selectedVenueIdx`, `selectedRacketIdx` bu değerlerle başlar.
   - `persistFriendly(patch)`: Karakter kartı, saha kartı, raket kartı tıklamalarında ve format (`mode`), insan sayısı (`humans`), set sayısı (`sets`), avantaj/altın puan (`golden`), AI zorluğu (`ai`) segment değişikliklerinde `padel.friendly.v1` kaydını günceller.
   - `syncFriendlySegments()`: Segment butonlarındaki `.is-selected` sınıfını kayıtlı form değerlerine göre senkronize eder.
   - Kariyer modu (`careerui.js`, `setCustomPreview`) ve online önizleme bu kayda dokunmaz.

3. **`test/friendlypicks.test.js`** (Yeni Birim Testleri):
   - `round trips valid selections`
   - `drops out-of-bounds indices and unknown values`
   - `clamps humans to 2 in singles mode (players: 2)`
   - `corrupt or non-object JSON returns empty object`
   - `does not throw when storage throws errors`
   - `null or missing storage returns empty object safely`

---

## 2. Test Sonuçları

`npm test` çalıştırıldı ve tüm 229 test başarıyla geçti:

```
✔ friendlypicks: round trips valid selections (4.271308ms)
✔ friendlypicks: drops out-of-bounds indices and unknown values (0.633967ms)
✔ friendlypicks: clamps humans to 2 in singles mode (players: 2) (0.389904ms)
✔ friendlypicks: corrupt or non-object JSON returns empty object (3.110578ms)
✔ friendlypicks: does not throw when storage throws errors (1.297213ms)
✔ friendlypicks: null or missing storage returns empty object safely (0.245805ms)
...
ℹ tests 229
ℹ suites 0
ℹ pass 229
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9424.420553
```

*(Not: Görev kuralına uygun olarak `npx vite build` çalıştırılmamıştır; canlı doğrulama dev server `http://localhost:5173` üzerinden headless Chrome ile yapılmıştır).*

---

## 3. Ekran Görüntüleri (`agents/reports/agy-24/`)

1. **`match-desktop.png`** (1280×720):
   - Skor tablosu (`#hud`) sol üstte (`top: 10px; left: 10px;`).
   - Tuş yardımı (`#help`) sağ üstte (`top: 12px; right: 12px; pos: 'tr'`).
   - Kamera rozeti (`#cam`) sağ altta (`bottom: 16px; right: 16px;`).
2. **`match-touch.png`** (844×390 yatay mobil):
   - Skor tablosu sol üstte.
   - Mobil üst çubuk (`.tc-top`) sağ üstte.
   - Sanal vuruş butonlarıyla çakışmaması için `#cam` ve `#help` dokunmatikte gizli.
3. **`training-lesson.png`** (1280×720):
   - Training ders paneli (`#tutorial`) `top: 125px; left: 16px;` ile sol üstteki skor tablosunun hemen altında çakışmasız yerleşir.
4. **`menu-remembered.png`** (1280×720):
   - Sayfa yenilendikten sonra oyuncunun seçtiği karakter (`Berk`), saha ve ayarlar `padel.friendly.v1` üzerinden yüklenerek sihirbazda seçili kalır.

---

## 4. Değişen ve Eklenen Dosyalar Özeti

- `src/friendlypicks.js` (Yeni dosya, saf yardımcı modül)
- `test/friendlypicks.test.js` (Yeni dosya, birim testleri)
- `src/menu.js` (`loadPicks`, `savePicks`, `persistFriendly`, `syncFriendlySegments`)
- `src/helpkeys.js` (`home = 'tr'`, varsayılan köşe)
- `index.html` (CSS: `#hud`, `#cam`, `#touchUi .tc-top`, `#help[data-pos="tl"]`, `#tutorial`)
- `agents/reports/agy-24/` (4 adet ekran görüntüsü)
- `AGENTS.md` (agy-24 durum güncellemesi)
