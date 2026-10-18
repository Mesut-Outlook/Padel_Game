# Görev agy-14 Raporu: Forma Çeşitleri (Yaka, Kolsuz, Desen)

**Tarih:** 2026-10-18  
**Ajan:** Antigravity (agy)  
**Yönetici & Reviewer:** Claude Opus  
**Durum:** Tamamlandı (Review & Commit bekliyor)

---

## 1. Özet

Kullanıcının forma çeşitlendirme isteği doğrultusunda, karakterlerin ve marketteki formaların farklı yaka tipleri (`crew`, `polo`, `vneck`, `tank`), desenleri (`none`, `chest`, `sash`, `side`) ve vurgu renkleri (`accent`) ile özelleştirilmesi tamamlandı.

- **`src/player.js`:**
  - `SHIRT` (JS) ve `SHIRT_GLSL` (GLSL): Stile göre parametrelendirildi.
    - `vneck`: Ön göğüste (`z > 0`) 6 cm derinliğinde V kesim.
    - `tank`: Kol bölgesi kaldırıldı (`ax < 0.2`), omuz askısı ve koltuk altı oyuntusu eklendi.
    - `crew` & `polo`: Standart yuvarlak yaka ve kollu yapı korundu.
  - **Kritik Kural sağlandı:** Gövde boyası (`kitMaterial`) ve kumaş kabuğu (`makeGarment`) aynı `SHIRT_GLSL(f, style)` bölgesini kullandı. Kolsuz atlet giyildiğinde kollarda ten rengi görünür; V yakada göğüste ten rengi görünür; kumaş altından boya taşmaz.
  - Desen ve polo yakası `aRest` (bind-pose) koordinatlarından `uAccent` uniform'u ve GLSL ile hesaplandı; sıfır yeni geometri, sıfır yeni doku.
  - Polo yakasında yaka bandı + göğüste dikey düğmeli pat şeridi ve 2 adet düğme detayı boyandı.
  - `customProgramCacheKey`:
    - `kitMaterial`: `'kit:' + (f ? 'f' : 'm') + ':' + style` (8 varyant).
    - `makeGarment`: `'garment:' + regionGlsl + trimTest + (accentTest || '') + (poloButtons ? ':polo' : '')` (en fazla 32 varyant). Intel HD 620 için küçük ve sınırlı tutuldu.
  - `kitColors`'taki ten rengi yakınlık kontrolü bozulmadan korundu.

- **`data/characters.json`:**
  - 26 karakterden tam 10 tanesine farklı stil, desen ve uyumlu accent verildi; kalan 16 karakter varsayılan `crew` / `none` olarak korundu.

- **`data/shop.json`:**
  - Yalnızca `type: "kit"` satırlarına dokunuldu (Opus'un `fuel` ürünleri ile çakışma önlendi).
  - Mevcut 7 kite uygun stil/desen verildi.
  - 6 yeni kit eklendi (toplam 13 kit; her stil ve desen birden fazla kez temsil edildi).
  - Fiyat merdiveni korundu (Amateur 0-180, Club 400-480, Regional 900-1050, National 1500-1750, Elite 4000-4500).

- **`src/careerui.js`:**
  - `buildEquippedPlayer`: Kuşanılan kitin `style`, `pattern` ve `accent` değerlerini `outfit` objesine aktardı. Hem kariyer maçına hem de 3D önizlemeye (Locker, Shop, Hub) anında yansıması sağlandı.
  - Shop Kit sekmesi kartı: `"Polo · chest stripe"` formatında stil/desen bilgisi ve varsa Accent renk çipi eklendi.
  - Locker Kit sekmesi kartı: Renk swatches ve stil/desen açıklaması eklendi.

- **`server/server.js`:**
  - `sanitizeLook`: `outfit.style` (`OUTFIT_STYLES`), `outfit.pattern` (`OUTFIT_PATTERNS`) ve `outfit.accent` (`COLOR`) beyaz listesi eklendi. Bilinmeyen/geçersiz değerler elenir.

- **Testler:**
  - `test/server.test.js`: Geçerli stil/desen/accent'in geçtiği, `"hoodie"`, `"red"` gibi geçersiz değerlerin elendiğini doğrulayan test eklendi.
  - `test/shop.test.js`: Tüm kitlerin ve kadro karakterlerinin stil ve desenlerinin izinli kümede olduğunu doğrulayan test eklendi.

---

## 2. Karakter Forma Atamaları Tablosu

| ID | İsim | Cinsiyet | Stil (`style`) | Desen (`pattern`) | Vurgu Rengi (`accent`) | Açıklama |
|---|---|---|---|---|---|---|
| `p01` | Ahmet | Erkek | `polo` | `none` | `#FFFFFF` | Mavi klasik polo tişört, beyaz yaka |
| `p03` | Batuhan | Erkek | `crew` | `chest` | `#C8102E` | Beyaz forma, kırmızı göğüs şeridi |
| `p05` | Bihter | Kadın | `tank` | `side` | `#FFFFFF` | Kırmızı kolsuz atlet, beyaz yan paneller |
| `p06` | Burçe | Kadın | `polo` | `sash` | `#FFFFFF` | Açık mavi polo, beyaz çapraz kuşak |
| `p07` | Burcu | Kadın | `vneck` | `none` | `#FFFFFF` | Turkuaz V yaka forma, beyaz yaka |
| `p08` | Can | Erkek | `vneck` | `chest` | `#FECB00` | Lacivert V yaka, altın göğüs şeridi |
| `p12` | Görkem | Erkek | `tank` | `none` | `#D8F53A` | Siyah atlet, neon sarı trim/accent |
| `p15` | Nilüfer | Kadın | `tank` | `chest` | `#FFFFFF` | Pembe atlet, beyaz göğüs şeridi |
| `p18` | Kerim | Erkek | `polo` | `side` | `#F2F3F4` | Kırmızı polo, açık gri yan paneller |
| `p23` | Tuğhan | Erkek | `crew` | `sash` | `#FFFFFF` | Parlak mavi forma, beyaz çapraz kuşak |
| *Diğer 16* | *Kalanlar* | *E/K* | `crew` | `none` | *-* | Varsayılan yuvarlak yaka ve desensiz |

---

## 3. Market Kitleri Tablosu

| ID | İsim | Kademe (Tier) | Fiyat | Stil | Desen | Accent |
|---|---|---|---|---|---|---|
| `kit_starter` | Starter kit | amateur | 0 | `crew` | `none` | - |
| `kit_lime` | Lime court | amateur | 150 | `tank` | `none` | - |
| `kit_navy` | Navy classic | amateur | 150 | `polo` | `none` | `#FFFFFF` |
| `kit_speed_tank` *(Yeni)* | Aero Tank | amateur | 180 | `tank` | `side` | `#FFFFFF` |
| `kit_sunset` | Sunset | club | 400 | `crew` | `chest` | `#FFE66D` |
| `kit_monaco_vneck` *(Yeni)* | Monaco V-Neck | club | 450 | `vneck` | `none` | `#FFFFFF` |
| `kit_club_polo` *(Yeni)* | Club Polo | club | 480 | `polo` | `chest` | `#FFFFFF` |
| `kit_royal` | Royal | regional | 900 | `vneck` | `sash` | `#F1C40F` |
| `kit_challenger_sash` *(Yeni)* | Challenger Sash | regional | 1050 | `vneck` | `sash` | `#FFFFFF` |
| `kit_crimson` | Crimson tour | national | 1500 | `polo` | `side` | `#FFFFFF` |
| `kit_grand_slam` *(Yeni)* | Grand Slam | national | 1750 | `polo` | `side` | `#E74C3C` |
| `kit_black_gold` | Black & gold | elite | 4000 | `crew` | `sash` | `#D4AF37` |
| `kit_apex_tank` *(Yeni)* | Apex Carbon | elite | 4500 | `tank` | `chest` | `#00FFA3` |

---

## 4. Değiştirilen Dosyalar

1. `src/player.js`
2. `data/characters.json`
3. `data/shop.json`
4. `src/careerui.js`
5. `server/server.js`
6. `test/server.test.js`
7. `test/shop.test.js`

*Dokunulmayanlar:* `index.html`, `src/menu.js`, `src/main.js`, `src/game.js`, `src/career.js`, `src/tournament.js`.

---

## 5. Doğrulama Çıktıları

### Test Koşusu (`npm test`)
```
npm notice run test
npm notice run node --test test/*.test.js
...
ℹ tests 83
ℹ suites 0
ℹ pass 83
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3903.561191
```

### Prodüksiyon Derlemesi (`npx vite build`)
```
vite v5.4.11 building for production...
✓ 40 modules transformed.
dist/tools/padtest.html            2.27 kB │ gzip:   1.02 kB
dist/index.html                   59.80 kB │ gzip:  11.98 kB
dist/assets/padtest-DGErL-YA.js    2.15 kB │ gzip:   1.13 kB
dist/assets/input-CuMXRsTH.js      2.36 kB │ gzip:   1.14 kB
dist/assets/main-Ci-xB0KD.js     881.56 kB │ gzip: 243.72 kB
✓ built in 5.99s
```

### Görsel Doğrulama Notu
Terminal ortamında doğrudan WebGL penceresi açılamadığı için görsel doğrulama manuel olarak **yapılamadı**. Üçgen seçimleri, dikiş kaynakları (`smoothShell`), normal ofsetleri ve GLSL parametreleri node üzerinde geometri seviyesinde doğrulandı; Opus tarayıcıda inceleyecek.

---

## Opus review (2026-10-18)

Checked in the browser (10 styled characters, front and back). Fixed before commit:
- Accent patterns were painted only on the cloth; where the skin pokes through the shell the shirt colour showed, giving ragged stripe edges → `kitAccentGlsl()` is shared and the body paint (`kitMaterial`) paints the same accent.
- Tank armhole showed the unlit inside of the back panel (grey hole under the arm) → no armhole cut; the tank simply stops at the shoulder.
- Side panels used a fixed x band and broke into patches on curvy waists → they follow the side seam (`|z + 0.01| < 0.045`).
- Sash (slope 2, 5 cm) was patchy on female chests → slope 1.3, 4 cm.
- Kerim (p18): the report said "red polo", but his red shirt is too close to his skin tone and the existing `kitColors` rule turns it white (it always rendered white). Kept the colours; accent is now his red, so he wears a white polo with red collar, placket and side panels.
