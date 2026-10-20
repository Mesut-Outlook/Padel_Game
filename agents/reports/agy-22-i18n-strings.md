# Rapor agy-22: Arayüz Metinlerini `t()` ile Sar (Çok Dil Desteği, Aşama 2)

- **Görev ID:** `agy-22`
- **Tarih:** 2026-10-20
- **Ajan:** Antigravity (Reviewer: Claude Opus)
- **Durum:** Tamamlandı

---

## 1. Genel Bakış ve Amaç

Oyunun 8 dilde (İngilizce, Almanca, İspanyolca, Türkçe, Fransızca, İtalyanca, Portekizce, Hollandaca) oynanabilmesi amacıyla başlatılan i18n altyapısının 2. aşaması tamamlanmıştır. Kullanıcının arayüzde gördüğü tüm kullanıcı metinleri `src/i18n.js` içindeki `t()` fonksiyonu ile, statik HTML sayfalarındaki metinler ise `data-i18n`, `data-i18n-html` ve `data-i18n-title` öznitelikleriyle sarılmıştır.

---

## 2. Kural Uyumu ve Tasarım Kararları

1. **Birebir Anahtar Korunumu:** İngilizce kaynak metinler harf büyüklüğü, noktalama ve boşluklar dahil değiştirilmeden anahtar olarak kullanıldı.
2. **Yer Tutucular (`{var}`) Kullanımı:** Şablon birleştirmesi (template literal `${}`) `t()` içinde asla kullanılmadı; tüm değişkenler tek parça cümle içinde `{var}` yer tutucusu ile `t('Level {n}', { n })` şeklinde aktarıldı.
3. **Cümle Bütünlüğü:** Cümleler parçalanmadı. İçinde biçimlendirme (`<b>`, `<kbd>`) bulunan ifadeler tek parça olarak tutuldu.
4. **`padText()` Dışta:** Kumanda glif dönüştürme fonksiyonu `padText(t(...))` şeklinde `t()`'nin dışına sarıldı.
5. **Veri Dosyaları (`data/*.json`):** JSON dosyalarına doğrudan dokunulmadı; tüketim anında `shopTab === 'racket' ? item.name : t(item.name)` ve `t(e.name)` şeklinde sarıldı.
6. **Çevrilmeyen Alanlar (Kural 6 ve 7 uyarınca):**
   - Karakter adları (özel isimler)
   - Raket adları (`rackets.json`)
   - Şehir ve mekan adları (`venues.json`)
   - Ülke kodları (`countryCode`)
   - Saf simülasyon dosyaları (`game.js`, `physics.js`, `rules.js`, `ai.js`, `level.js`, `career.js`, `matchstats.js`) ortak sunucu çalıştırması nedeniyle `i18n.js` import etmedi; mesajları arayüz katmanında (`coachTip`, `pointCall`) gösterilirken sarıldı.
   - GoatCounter olay adları (`track(...)`), `localStorage` anahtarları, CSS sınıfları
   - Ses dosyaları / konuşma motoru (`voice.js`, `audio.js`) aşama 2 kapsamı dışında bırakıldı.
   - Yasal metin (`privacy.html`).

---

## 3. Dosya Başına `t()` ve `data-i18n` Sayımları

| Dosya | `t()` Sayısı | `data-i18n*` Sayısı | Açıklama |
|---|---|---|---|
| `src/careerui.js` | 476 | 0 | Hub, Creator, LevelStart, Play, Training, Shop, Locker, Reward, Profile, Tournaments, Online vb. tüm ekranlar |
| `src/menu.js` | 114 | 0 | Hızlı maç paneli, mod, oyuncu, raket, zorluk, saha, ayarlar, istatistik etiketleri |
| `src/main.js` | 74 | 0 | Oyun içi HUD, sayı anonsları (`pointCall`), smash bannerları, duraklat menüsü (`Esc`), yemek teklifleri |
| `src/tutorial.js` | 39 | 0 | 12 eğitim dersi, ipuçları, adımlar, tamamlama mesajları |
| `src/home.js` | 37 | 0 | Ana karşılama ekranı, kariyer/hızlı maç/eğitim/kontroller/ayarlar kartları ve ipuçları |
| `src/helpkeys.js` | 14 | 0 | Oyun içi tuş ve kumanda yardım diyagramı açıklamaları |
| `src/fullscreen.js` | 8 | 0 | Tam ekran aç/kapat etiketleri ve bildirim metinleri |
| `src/touch.js` | 8 | 0 | Dokunmatik ekran kontrolleri (`SHOT`, `LOB`, `SMASH`, vb.) ve dokunmatik ipuçları |
| `src/charcard.js` | 5 | 0 | Karakter güçlü/zayıf yön analizi ve taktik ipucu üreteci |
| `src/tips.js` | 1 | 0 | Yükleme ve bekleme anı ipuçları tablosu |
| `index.html` | 0 | 44 | Açılış ekranı ipucu, eski form etiketleri, ses rozeti, tam ekran butonu, rotasyon uyarısı |
| `kontroller.html` | 3 | 111 | Kontrol paneli tabloları, tuş açıklamaları, kumanda şemaları (`loadLang` ile başlatıldı) |
| **Toplam** | **776** | **155** | **931 arayüz dizesi uluslararasılaştırıldı** |

---

## 4. Doğrulama ve Test Sonuçları

### A. Template Literal / `${}` Denetimi
```bash
node -e '
const fs = require("fs");
const files = fs.readdirSync("src").filter(f => f.endsWith(".js"));
for (const file of files) {
  const content = fs.readFileSync("src/" + file, "utf8");
  const matches = content.match(/t\(`[^`]*\${[^`]*`\)/g);
  if (matches) console.error("Found template literal with interpolation in " + file + ":", matches);
}
console.log("Check complete.");
'
```
Sonuç: `src/` içinde `t()` içine gömülü hiçbir `${}` bulunmamaktadır (sıfır ihlal).

### B. Birim Testleri (`npm test`)
```
ℹ tests 180
ℹ suites 0
ℹ pass 180
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2918.293761
```
Tüm 180 test sıfır hata ile başarıyla geçmiştir.

### C. Üretim Derlemesi (`npx vite build`)
```
dist/tools/padtest.html                           2.37 kB │ gzip:   1.05 kB
dist/privacy.html                                 2.75 kB │ gzip:   1.41 kB
dist/kontroller.html                             23.13 kB │ gzip:   5.98 kB
dist/index.html                                  92.15 kB │ gzip:  18.10 kB
dist/assets/main-Dy0EXoNj.js                      0.49 kB │ gzip:   0.34 kB
dist/assets/tr-CvWL7tV9.js                        0.61 kB │ gzip:   0.46 kB
dist/assets/modulepreload-polyfill-B5Qt9EMX.js    0.71 kB │ gzip:   0.40 kB
dist/assets/padtest-BgzKIi_o.js                   2.20 kB │ gzip:   1.16 kB
dist/assets/input-DvUCVv9t.js                     2.44 kB │ gzip:   1.18 kB
dist/assets/i18n-DIwEudKk.js                      2.58 kB │ gzip:   1.38 kB
dist/assets/controls-CbK6vAR4.js                  3.39 kB │ gzip:   1.74 kB
dist/assets/helpkeys-Dy5jpjgg.js                  9.23 kB │ gzip:   4.13 kB
dist/assets/main-DJ9CZY-g.js                    949.01 kB │ gzip: 265.64 kB
✓ built in 3.14s
```
Derleme hatasız tamamlanmıştır.

---

## 5. Değiştirilen Dosyalar

- `index.html`
- `kontroller.html`
- `src/home.js`
- `src/menu.js`
- `src/careerui.js`
- `src/main.js`
- `src/tutorial.js`
- `src/tips.js`
- `src/touch.js`
- `src/helpkeys.js`
- `src/fullscreen.js`
- `src/charcard.js`
- `AGENTS.md`
- `agents/reports/agy-22-i18n-strings.md`
