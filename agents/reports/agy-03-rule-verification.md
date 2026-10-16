# Görev agy-03 Raporu: Resmi FIP / Premier Padel Kural Doğrulaması

**Ajan:** Antigravity (agy / Gemini)  
**Tarih:** 16 Ekim 2026  
**Durum:** Tamamlandı  
**Kaynak Belgeler:** FIP Official Regulations of Padel (Rules 1-17), Premier Padel Tournament Regulations 2025/2026

---

## 1. Star Point 2026'nın Kesin İşleyişi

FIP Kural 1 (Option 2) ve Premier Padel regülasyonlarında tanımlanan resmi **Star Point** hibrit bir modeldir:

1. **Deuce 1 (40–40):** Klasik avantaj kuralıyla oynanır. Sayıyı alan takım avantajı alır. Sonraki sayıyı da alırsa oyun biter.
2. **Deuce 2:** Eğer avantajı alan takım sayıyı kaybederse skor tekrar eşitlenir (40–40). İkinci kez klasik avantaj oynanır.
3. **Star Point (Deuce 3 / Ani Ölüm):** Eğer ikinci avantaj da bozulup tekrar eşitlik olursa, oyun artık sonsuz deuce'a gitmez; tek bir karar sayısı olan **"Star Point"** oynanır.
   - Karşılayan çift, servisi hangi oyuncunun (sağ veya sol kutu) karşılayacağını seçer.
   - Bu tek sayıyı kazanan takım oyunu (`game`) kazanır.

*Karar:* agy-01 raporundaki hibrit 2-avantajlı tanım **kesinlikle doğrudur**.

---

## 2. Taraf Değiştirme (Change of Ends) Kuralları

- **Normal Oyunlarda:** Bir sette oynanan toplam oyun sayısı **tek sayı** olduğunda (1, 3, 5, 7, 9...) takımlar taraf değiştirir.
  - Set 6-3 gibi tek sayıda biterse takımlar hemen taraf değiştirir.
  - Set 6-2 gibi çift sayıda biterse takımlar yerinde kalır, yeni setin ilk oyunundan sonra taraf değiştirir.
- **Tie-Break İçinde:** Tie-break oynanırken her **6 puanda bir** (toplam puan 6, 12, 18 olduğunda) takımlar mola vermeksizin derhal sahaları değişir.

---

## 3. Tie-Break ve Set Başında Servis Sırası

- **Tie-Break Servis Sırası:**
  1. Servis sırası gelen oyuncu, sağ servis kutusundan **1 puan** servis atar.
  2. Ardından rakip takımdaki sıradaki oyuncu önce sol, sonra sağ kutudan **2 puan** servis atar.
  3. Ardından ilk takımın ikinci oyuncusu sol ve sağdan **2 puan** atar.
  4. Maç bitene kadar her 2 puanda bir servis sırası döner.
- **Set Başında Servis Sırası:**
  - Bir set tie-break ile sonuçlandığında, sonraki setin ilk oyununda servisi **tie-break'te ilk servisi KARŞILAYAN takım** atar.

---

## 4. Super Tie-Break (Match Tie-break / 10 Puan)

- **Evet, FIP resmi kurallarında vardır.** (FIP Rule 2, Option 3):
- Birçok turnuvada (özellikle FIP Promises, FIP Rise, kıdemli turnuvalar ve Premier Padel eleme turlarında) 1-1 set eşitliği durumunda 3. set yerine **10 puanlık Super Tie-Break** (Match Tie-Break) oynanır. En az 2 puan farkla ilk 10 puana ulaşan maçı kazanır.

---

## 5. `src/rules.js` İçindeki Çelişkiler

| Satır | Mevcut Kod | Doğru FIP Kuralı | Kaynak |
|---|---|---|---|
| **`rules.js:8`** | `opts: { sets: 3, goldenPoint: true }` | Yalnızca boolean goldenPoint var; Star Point (`'star'`) ve Super Tie-Break (`matchTiebreak: true`) seçenekleri eksik. | FIP Rule 1 & Rule 2 |
| **`rules.js:35`** | `[-zs * serveSide(m) * 2.5, zs * 9.6]` | 9.6 m arka cama 40 cm mesafedir. Oyuncu 6.95 m servis çizgisi arkasında olmalıdır, ideal duruş 7.6 – 8.4 m arasıdır. | FIP Rule 6 (Service) |
| **`rules.js:105`** | `if (m.tiebreak && (p[0] + p[1]) % 2 === 1) m.serveIdx++;` | Tie-break içinde her 6 puanda bir kort tarafı değiştirme (`changeEnds`) tetikleyicisi eksik. | FIP Rule 7 (Ends) |
| **`rules.js:127`** | `if (!m.tiebreak) m.serveIdx++;` | Tie-break sonrası yeni set başlangıcında tie-break'i karşılayan takımın servise geçmesi kuralı zorlanmıyor. | FIP Rule 2 (Tie-break) |
| **`rules.js:112`** | `const s = m.sets[m.sets.length - 1];` | Tek oyun toplamlarında (1, 3, 5...) taraf değiştirme durumu döndürülmüyor. | FIP Rule 7 |

---

## 6. Opus İçin Öneriler (En Önemli 5 Madde)

1. **`deuceMode` Seçeneği Eklenmeli:** `newMatch({ deuceMode: 'golden' | 'star' | 'advantage' })` şeklinde genişletilerek Star Point stage sayacı (`m.deuceStage = 0, 1, 2`) eklenmeli.
2. **Kort Taraf Değişimi (`courtEnds`) Olayı:** Tek oyunlarda ve tie-break'te 6'şar puanda Three.js kamerasının veya oyuncu başlangıç sahalarının yer değiştirmesi için `m.changeEnds = true` olayı üretilmeli.
3. **Servis Çizgisi Duruşu:** `servePosition` içindeki `9.6` m derinliği `8.0` m seviyesine çekilerek servisçinin arka cam yerine servis kutusuna daha yakın olması sağlanmalı.
4. **Tie-break Sonrası Servisçi Düzeltmesi:** Tie-break bittiğinde `m.serveIdx`, tie-break'e servisle başlayan takımın rakibine eşitlenecek şekilde ayarlanmalı.
5. **Super Tie-break Desteği:** `opts.matchTiebreak` true ise 3. sette doğrudan 10 puanlık tie-break başlatılmalı.

---
*Rapor `agents/reports/agy-03-rule-verification.md` dosyasına kaydedilmiştir.*

## Opus incelemesi
- Uygulandı: `starPoint` (`m.deuces`), `superTiebreak` (3. set yerine 10 sayılık tie-break), tie-break sonrası servis `tbStart + 1`. Hepsinin testleri `test/rules.test.js`'te, menüden ve online odadan seçilebiliyor.
- Reddedildi: `servePosition` 9.6 m bir kural ihlali değil, servis çizgisinin arkasında her yer geçerli.
- Ertelendi: taraf değiştirme. Oyunda kamera ve kontrol yönünü maç ortasında ters çevirirdi; ancak bir TV kamerası seçeneğiyle anlamlı olur.
