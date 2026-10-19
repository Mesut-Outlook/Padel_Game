# Görev agy-17: Pause yalnızca Esc + tüm oyuncuların enerji çubukları

Sen Antigravity ajanısın; Claude Opus reviewer. Commit ve push yapma — yalnızca Opus commit eder.

Kullanıcı talebi (2026-10-18): *"tum oyuncularin enerji durumlarini gorebilelim... klavye de p tusu pause olarak atanmis ve oyun tuslari ile cok yakin onun yerine esc yapalim"*

İzinli komutlar: `ls`, `cat`, `find`, `grep`, `head`, `wc`, `sed`, `node`, `npm test`, `npx vite build`, `git diff`, `git status`. Başka komut çalıştırma.

## 1. Klavyede pause = yalnızca Esc (P artık hiçbir şey yapmaz)

P tuşu vuruş tuşlarının (U I O K L) hemen yanında; yanlışlıkla pause açılıyor.

- `src/main.js`
  - Maç döngüsü (`consumePressed('KeyP') | consumePressed('Pause') | (!replay.playing && consumePressed('Escape'))`): `KeyP`'yi kaldır. `Pause` tuşu ve kolun Start'ı kalsın. Tekrar oynatma sırasında Esc yine tekrarı atlar (mevcut davranış), pause açmaz.
  - `pauseInput()` içindeki `back`: `KeyP`'yi kaldır (Esc, Pause, B, Start kalsın).
  - Maç bitince skor ekranında "P ile menüye dön" davranışı aynı satırda; Esc ile çalışmaya devam etsin.
  - Dosyanın başındaki/yanındaki yorumları güncelle ("Pause menu: P, Esc…").
- **Tam ekranda Esc:** Tarayıcı tam ekranda Esc'yi kendisi yutar (tam ekrandan çıkar, sayfa tuşu görmez). Bu yüzden `src/fullscreen.js` tam ekrana girerken `navigator.keyboard?.lock?.(['Escape'])` çağırsın (Chromium'da Esc sayfaya gelir; kullanıcı Esc'yi **basılı tutarak** tam ekrandan çıkar), çıkarken `navigator.keyboard?.unlock?.()`. Desteklenmeyen tarayıcıda sessizce geçsin (try/catch, `?.`). Var olan testleri bozma; `test/fullscreen.test.js`'e lock/unlock çağrıldığını (varsa) kontrol eden bir test ekle.
- Yardım metinleri — P'yi pause olarak gösteren her yer:
  - `src/helpkeys.js`: `K` sözlüğündeki `KeyP: ['P', 'sys', 'pause']` girdisini kaldır (tuş düzeninde P tuşu etiketsiz kalır); alt satırdaki `<b>P</b> / <b>Esc</b>: pause` → `<b>Esc</b>: pause`.
  - `index.html` `#pause .pz-hint` ve `drawPause()` içinde üretilen ipucu metni: `P / Esc / Start` → `Esc / Start`.
  - `public/kontroller.html`: `<kbd>P</kbd> / <kbd>Esc</kbd>` satırı → yalnızca `<kbd>Esc</kbd>`.
  - `src/tips.js`'te P geçiyorsa düzelt.
  - `grep -rn "KeyP\|>P<\|P /" src public index.html` ile başka kalan yer olmadığını doğrula.

## 2. Tüm oyuncuların enerji çubukları

Bugün `renderEnergy()` (`src/main.js`, `#hudEnergy`) yalnızca yerel insan oyuncuları (`humans`) gösteriyor. Tüm **aktif** oyuncuları göster (tekli: 2, çiftler: 4).

- Yerleşim: skor tablosundaki `#hudEnergy` kutusunda **iki sütun** — solda takım 0 (oyuncular 0,1), sağda takım 1 (2,3). Tekli maçta bir satır, çiftlerde iki satır. Her hücre: kısa ad (mevcut `split(' ').pop()` kuralı) + çubuk.
- Yerel insan oyuncuların adı vurgulu olsun (ör. accent renk / kalın), AI'lar normal.
- Değer kaynağı aynı kalır: offline `world.players[id].energy`, online `view.pl[id][7]`.
- Renk sınıfları aynı (`low` < 0.25, `mid` < 0.5). "😮‍💨 TIRED" uyarısı yalnızca **ilk yerel insan** için (bugünkü gibi); insan yoksa (izleme modu) uyarı yok.
- İzleme modunda (0 insan) da çubuklar görünsün.
- Kutu yeniden kurulumu (`innerHTML`) yalnızca oyuncu listesi değişince; her karede yalnızca `style.width`/`className` güncellenir (bugünkü desen — DOM churn yok).
- CSS `index.html`'de mevcut `.he-row` / `.he-bar` stillerinin yanına; iki sütun için grid. Skor tablosu çok büyümesin.
- **Çakışma kontrolü:** `#hypeToast` `top: max(150px, 22%)`. Çiftler maçında skor tablosunun alt kenarı bu bildirimin üst kenarından en az 8 px yukarıda kalmalı. Ölçüp raporuna yaz (`getBoundingClientRect`); gerekirse bildirimin `top` değerini artır.

## 3. Test, build, rapor

- `npm test` ve `npx vite build` geçmeli; çıktıların son satırlarını rapora koy.
- Rapor: `agents/reports/agy-17-esc-pause-energy-hud.md` — değiştirdiğin dosyalar ve satırlar, ölçtüğün değerler. Kodda olmayan bir isim yazma; Opus her ismi grep ile kontrol eder.
