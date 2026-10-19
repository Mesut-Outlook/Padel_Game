# Görev agy-22: Arayüz metinlerini `t()` ile sar (çok dil desteği, aşama 2)

Sen Antigravity ajanısın; Claude Opus reviewer. Commit ve push yapma — yalnızca Opus commit eder.

Kullanıcı talebi (2026-10-20): oyun 8 dilde olsun — İngilizce, Almanca, İspanyolca, Türkçe, Fransızca, İtalyanca, Portekizce, Hollandaca. Plan: `docs/superpowers/plans/2026-10-20-i18n.md`.

İzinli komutlar: `ls`, `cat`, `find`, `grep`, `head`, `wc`, `sed`, `node`, `npm test`, `npx vite build`, `git diff`, `git status`. Başka komut çalıştırma. Başka bir Claude oturumu aynı klasörde çalışabilir — **her dosyayı düzenlemeden hemen önce yeniden oku**, başkasının değişikliğini bozma.

## Hazır olan (Opus, dokunma)

- `src/i18n.js`: `t(text, vars)`, `translateDom(root)`, `LANGS`, `pickLang`, `loadLang`. **Anahtar = bugünkü İngilizce metnin kendisi.** Çevirisi olmayan metin İngilizce görünür.
- `src/boot.js`: dili yükler, `translateDom(document)` çalıştırır, sonra `main.js`'i başlatır — yani `t()` modül seviyesinde de doğru dili döndürür.
- `src/settingsmodal.js`: **örnek dosya** — metinlerin nasıl sarıldığına bak.
- `src/locales/tr.js`: küçük başlangıç tablosu. Çevirileri **sen yazma**; Opus/Sonnet sonra yazacak.

## İstenen

Kullanıcının ekranda gördüğü her İngilizce metni `t()` ile sar.

### Kurallar

1. **Metni değiştirme.** Anahtar, bugünkü İngilizce metnin birebir aynısı (büyük/küçük harf, noktalama dahil). Yazım düzeltmesi yapma.
2. **`${}` ile birleştirme yok.** Değişken içeren cümle tek parça kalır, yer tutucu kullan:
   - Yanlış: `` t(`Level ${n}`) `` · `'Win ' + n + ' points'`
   - Doğru: `t('Level {n}', { n })` · `t('Win {n} points', { n })`
3. **Bir cümle = bir `t()`.** Cümleyi parçalara bölme (diller kelime sırasını değiştirir). İçinde `<b>` gibi işaretleme olan cümleyi tek anahtar olarak bırak: `` t('Press <b>{key}</b> to serve', { key: k.hit }) ``.
4. **`padText()` dışta kalır:** `padText(t('A Save · B Close'))`.
5. **Statik HTML** (`index.html`): metin içeren öğeye `data-i18n` ekle (içinde `<b>`/`<kbd>` varsa `data-i18n-html`, `title` için `data-i18n-title`). `boot.js` bunları açılışta çevirir; JS'de `t()` gerekmez.
6. **Veri dosyaları** (`data/*.json`): JSON'u değiştirme; gösterildiği yerde sar:
   - çevrilecek: `shop.json` `name` + `desc`; `tournaments.json` `name` + `description`
   - **çevrilmeyecek:** karakter adları, raket adları (`rackets.json` `name`), mekan ve şehir adları (`venues.json`), ülke kodları
7. **Çevrilmeyecekler:**
   - `track(...)` olay adları, `localStorage` anahtarları, CSS sınıfları
   - tuş adları (`Space`, `Esc`, `WASD`)
   - `server/server.js`. Sunucu hata mesajı istemcide gösterildiği yerde `t(msg)` ile sarılır.
   - `src/voice.js` / `audio.js` sesli anonsları (aşama 2'de)
   - `privacy.html` (yasal metin, İngilizce kalır)
   - testler, `tools/`
8. Padel terimleri (bandeja, víbora, chiquita, contrapared, smash, lob) anahtarda olduğu gibi kalır; çevirmen karar verir.
9. Çoğul için iki ayrı anahtar ya da nötr cümle kullan (`'{n} match(es)'` gibi garip biçimler kullanma; mevcut metin neyse o).

### Dosyalar (bu sırayla)

`src/home.js`, `src/menu.js`, `src/careerui.js` (en büyük), `src/main.js` (HUD, duraklat menüsü, mesajlar, yemek kutusu), `src/tutorial.js` (dersler ve ipuçları), `src/tips.js`, `src/touch.js` (dokunmatik ipuçları; düğme etiketleri SHOT/LOB/… da), `src/helpkeys.js`, `src/fullscreen.js` (`HINT` ve düğme yazıları), `src/charcard.js`, `src/pointcall.js` (sayı bildirimleri), `index.html` (`data-i18n`), `kontroller.html`.

`kontroller.html` `boot.js` kullanmıyor. Modül betiğinin başında dili kendisi yüklesin, sonra kumanda çizimlerini çizsin. Üst düzey `await` kullanma:

```js
loadLang(pickLang(loadSettings().lang, navigator.languages || [navigator.language])).then(() => {
  translateDom(document);
  /* çizim */
});
```

Kalan dosyalar: `grep -n "'[A-Z][a-z]" src/*.js` ile ara. Saf oyun modülleri (`game.js`, `physics.js`, `rules.js`, `ai.js`, `level.js`, `career.js`, `matchstats.js`) sunucuyla ortak; bunlara `i18n.js` import etme. Bu dosyalardaki metin (ör. `coachTip` metni) arayüz dosyasında gösterilirken sarılır.

## Test, build, rapor

- `npm test` ve `npx vite build` geçmeli. Son satırları rapora koy.
- `node -e` ile kontrol et: `src/` içindeki her `t(` çağrısının ilk argümanı düz bir string olmalı, `${` içermemeli. Kalan istisnaları raporda listele.
- Tarayıcıda (`npx vite` çalıştırma izni yok) deneme yapamazsın. Opus deneyecek.
- Rapor: `agents/reports/agy-22-i18n-strings.md`. İçinde:
  - dosya başına `t(` / `data-i18n` sayısı
  - sarmadığın ve neden sarmadığın metinler
  - kurallara uymayan ya da emin olmadığın yerler

  Kodda olmayan bir isim yazma; Opus her ismi grep ile kontrol eder.
