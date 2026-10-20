# Görev agy-24: Skor tablosu sol üst, yardım sağ üst + Friendly seçimleri hatırlansın

Sen Antigravity ajanısın; Claude Opus reviewer. Commit ve push yapma, yalnızca Opus commit eder.

Plan: `docs/superpowers/plans/2026-10-21-roadmap.md` maddeleri **A1** ve **A2**.

İzinli komutlar: `ls`, `cat`, `find`, `grep`, `head`, `wc`, `sed`, `node`, `npm test`, `git diff`, `git status`. **`npx vite build` çalıştırma** (ana `dist/` başka işler için kullanılıyor). Tarayıcıda denemek için açık olan geliştirme sunucusunu kullan: `http://localhost:5173`.

Opus aynı anda başka dosyalarda çalışıyor: `src/game.js`, `src/rules.js`, `src/input.js`, `src/main.js`. Bu dosyalara **dokunma**. Düzenlemeden hemen önce dosyayı yeniden oku.

`src/court.js` ve `src/crowdatlas.js` dosyalarında senin önceki (seyirci yönü) değişikliklerin commit'siz duruyor. Onlara bu görevde dokunma, Opus ayrıca inceliyor.

## A1. Maç içi yerleşim (yalnızca `index.html` CSS + `src/helpkeys.js`)

- **Skor tablosu** `#hud` (`index.html` ~688: `top: 10px; left: 50%; transform: translateX(-50%)`) → ekranın **sol üst** köşesine: `top: 10px; left: 10px`, `transform` yok. `#hud.away` (B tuşuyla gizlenen mod) ve telefon/dokunmatik kuralları da sol üstte çalışsın: `grep -n "#hud" index.html` ile bütün kuralları bul.
- **Tuş yardımı** `#help`: varsayılan köşe `src/helpkeys.js` ~75 `const home = isTouch() ? 'tl' : 'bl';` → masaüstünde **`tr`**. Dokunmatikte `#help` zaten gizli, ama varsayılanı `'tl'` kalırsa skor tablosunun üstüne biner: dokunmatik varsayılanı da `'tr'` yap. Oyuncunun daha önce kaydettiği köşe (`localStorage`) korunsun. Ama kayıtlı köşe `tl` ise skor tablosuyla çakışmasın: `tl` seçilince yardım skor tablosunun altına insin (`top` değerini skor tablosunun yüksekliği kadar artır ya da `#help[data-pos="tl"]` için `top: 120px` gibi bir değer).
- **Kamera rozeti** `#cam` (`index.html` ~726, sağ üstte) → **sağ alt** (`bottom: 16px; right: 16px`, `top` yok). `#help[data-pos="br"]` zaten `bottom: 52px` ile kameranın üstünde duruyor, bunu bozma.
- Çakışma kontrolü (ekran görüntüsüyle):
  - `#replayTag`: `body:has(#help[data-pos="tr"]...)` kuralı var, oku.
  - Ders paneli `#tutorial` (Training): `body:has(#tutorial:not(.final)) #help[data-pos="tl"]` kuralı var.
  - Smash banner'ı, `#msg` / hype yazıları, telefon üst çubuğu (🎥 ⏸ 🔁 🔈 ❔, `body.touch`).

## A2. Friendly seçimleri hatırlansın (yalnızca `src/menu.js` + yeni test)

- Bugün sihirbaz her açılışta oyuncu, saha, raket ve maç ayarlarını sıfırlıyor. Bunlar `index.html`'deki gizli form alanlarından okunuyor (`menu.js` ~262: `$('char')`, `$('venue')`, `$('racket')`; segmentler `bindSegment('pl-sets-seg', 'sets')` vb. ~805). Kontrol ve hız zaten `settings.js` ile kaydediliyor, onlara dokunma.
- Yeni `localStorage` anahtarı **`padel.friendly.v1`**: `{ char, venue, racket, sets, golden, ai, humans, players }`. Bunlar gizli alanların adlarıdır; `index.html`'de gerçek `id`'leri `grep` ile doğrula, olmayan alan uydurma.
- Saf yardımcıları ayrı bir küçük modüle koy, `src/friendlypicks.js`:
  - `loadPicks(storage, limits)`: geçersiz değeri at. Örneğin karakter indeksi `characters.length` dışındaysa ya da değer listede yoksa o alanı yok say. Bozuk JSON ise boş nesne. `storage` yoksa ya da hata atıyorsa boş nesne.
  - `savePicks(picks, storage)`: hata atarsa sessizce geç.
- `menu.js`: sihirbaz kurulmadan önce kayıtlı değerleri gizli alanlara yaz (`selectedCharIdx` vb. bu değerlerden başlasın). Her seçim değişince kaydet: karakter kartı, saha kartı, raket kartı ve maç segmentleri.
- Kariyer (`careerui.js`, `setCustomPreview`) ve online önizlemesi bu kaydı **değiştirmesin**.
- `test/friendlypicks.test.js`: geçerli kayıt geri gelir; sınır dışı indeks atılır; bozuk JSON → `{}`; `storage` hata atınca çökmez.

## Bitirince

- `npm test` geçmeli, son satırları rapora koy.
- Yeni UI metni yok. Eklersen 7 dile ekle ve `node tools/extract-keys.js` çalıştır.
- Ekran görüntüleri `agents/reports/agy-24/` altına:
  - maç içi 1280×720 masaüstü,
  - telefon yatay (`?touch`),
  - Training dersi açıkken,
  - sihirbazda sayfa yenilendikten sonra seçili kalan oyuncu.
- Rapor `agents/reports/agy-24-hud-layout-remember-picks.md`: değişen dosyalar ve fonksiyonlar. Kodda olmayan isim yazma, Opus her ismi `grep` ile kontrol eder ve görüntüleri kendisi de tarayıcıda kontrol eder.
