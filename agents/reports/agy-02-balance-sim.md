# Görev agy-02 Raporu: Denge Simülatörü ve FIP Kalibrasyonu

**Ajan:** Antigravity (agy / Gemini)  
**Tarih:** 16 Ekim 2026  
**Durum:** Tamamlandı  
**İlgili Dosyalar:** `src/physics.js`, `test/physics.test.js`, `tools/sim.js`

---

## 1. FIP Sekme Testi Kalibrasyonu

- **Mevcut Durum:** `K.floor.e = 0.74` ile 2.54 m'den bırakılan top 1.2986 m sekerek FIP'in alt sınırı olan 1.35 m'nin altında kalıyordu.
- **Değişen Sabit:** `src/physics.js` içinde `K.floor.e = 0.77` olarak güncellendi.
- **Test Sonucu:** 2.54 m serbest düşüşte ilk sekme yüksekliği **1.4009 m** olarak ölçüldü. Bu değer resmi FIP standardı olan **1.35 m – 1.45 m** aralığının tam merkezindedir.
- **Test Suite:** `test/physics.test.js` içine `FIP ball bounce test: dropped from 2.54m rebounds between 1.35m and 1.45m` testi eklendi; tüm 23 test başarıyla geçmektedir.

---

## 2. Denge Simülatörü (`tools/sim.js`) Çıktıları

`tools/sim.js` deterministik LCG rastgele sayı üreteci, 60 sim-saniye takılma koruması ve detaylı istatistik toplayıcı ile yazıldı.

### A. Temel Simülasyon (500 Puan, Club Seviyesi, Seed 12345)
- **Oynanan Puan:** 500
- **Skor Dağılımı:** Takım 0: 229 (%45.8) — Takım 1: 271 (%54.2) (Dengeli simetrik AI)
- **Takılma (Stuck Points):** 0
- **Ralli Uzunluğu:**
  - Ortalama: **6.07** vuruş
  - Medyan: **5** vuruş
  - Maksimum: **46** vuruş
- **Sayı Nedenleri Dağılımı:**
  - `double bounce`: 260 (%52.0)
  - `hit opponent wall directly`: 123 (%24.6)
  - `bounced own side`: 117 (%23.4)
- **Vuruş Türleri Dağılımı:**
  - `drive`: 2044 (%69.0)
  - `serve`: 500 (%16.9)
  - `lob`: 186 (%6.3)
  - `bandeja`: 106 (%3.6)
  - `smash`: 80 (%2.7)
  - `volley`: 73 (%2.5)
  - `vibora`: 35 (%1.2)
  - `chiquita`: 12 (%0.4)
- **Hata Oranı (Unforced Error):** %8.99
- **Servis İstatistikleri:** Toplam: 500, Hata Oranı: %0.00, Çift Hata: %0.00, Let: %0.00

---

### B. Tüm AI Seviyelerinin Karşılaştırması (Her biri 300 Puan)

| Metrik | ROOKIE | CLUB | PRO | LEGEND |
|---|---|---|---|---|
| **T0 / T1 Skoru** | 158 - 142 (%52.7) | 140 - 160 (%46.7) | 152 - 148 (%50.7) | 144 - 156 (%48.0) |
| **Ortalama Ralli** | 5.15 | 6.29 | 8.95 | 9.40 |
| **Medyan Ralli** | 4 | 5 | 7 | 8 |
| **Maksimum Ralli**| 27 | 32 | 62 | 40 |
| **Hata Oranı** | %9.96 | %8.47 | %9.31 | %9.54 |
| **Voley Sayısı** | 4 | 39 | 590 | 1024 |
| **Smaç Sayısı** | 5 | 50 | 368 | 410 |
| **Lob Sayısı** | 56 | 121 | 515 | 449 |
| **Bandeja/Víbora**| 34 | 94 | 290 | 124 |

*Gözlem:* Seviye yükseldikçe oyun "baseline drive" tenisinden gerçek padel tarzı "file önü voley / hava smaç / aşırtma (lob)" dinamiğine kusursuz bir şekilde evrilmektedir.

---

## 3. Anomaliler (Opus İçin İnceleme Listesi)

1. **`src/game.js:83` — Serviste Unforced Error Engeli:**
   - *Sorun:* `if (kind !== 'serve')` şartı nedeniyle serviste unforced error olasılığı hesaplanmamaktadır. AI seviyesi ne olursa olsun (Rookie dahil) servis hata oranı %0.00'dır; gerçekçi bir spor oyununda Rookie/Club seviyesinde %5-%10 civarında ilk servis hatası ve %1-%2 çift hata beklenir.
   - *Öneri:* `kind === 'serve'` için de hafif bir hata payı formüle edilmeli veya `aimVelocity` hedefine seviyeye bağlı daha geniş bir Gauss sapması verilmelidir.

2. **`src/game.js:151` — Maç Sonu ('over') Durum Kilidi:**
   - *Sorun:* `w.state === 'over'` olduğunda `w.timer` azalsa bile `resetPositions` çağrılmamaktadır. İstemcide maç sonu ekranı için uygun olsa da, sunucu veya uzun simülasyonlarda dünya kalıcı olarak donmaktadır.
   - *Öneri:* `stepWorld`'e opsiyonel bir `autoRestartMatch: true` parametresi eklenmeli veya maç bittiğinde bir `'match_over'` bayrağı ile yeniden başlatma mekanizması sunulmalıdır.

3. **`src/ai.js:10-14` — Rookie Seviyesinde Voley Yokluğu:**
   - *Sorun:* Rookie seviyesinde 300 puanda sadece 4 voley ve 5 smaç atılmıştır. AI oyuncuları fileye neredeyse hiç yaklaşmamakta ve dip çizgide sabit kalmaktadır.
   - *Öneri:* Padel çiftler oyunu olduğu için takımdan en az bir oyuncunun servis karşılamadan sonra fileye adım atması (`tm.posture = 'net'`) Rookie seviyesinde de düşük ihtimalle tetiklenmelidir.

---
*Rapor `agents/reports/agy-02-balance-sim.md` dosyasına kaydedilmiştir.*

## Opus incelemesi
- Anomali 1 düzeltildi: `strike` içinde servis hatası var, olasılık `(1-ctl)*0.2`, ikinci serviste `*0.05`. Ayrıca vuruş artık topun en yakın geldiği anda yapılıyor, menzil sınırında değil (`test/game.test.js`). Club seviyesinde, 300 sayı: servis hatası %8.9, çift hata %0.3, ralli ortalaması 6.3. Pro'da ralli ortalaması 9.8.
- Anomali 2: `over` durumu bilerek donuk kalıyor. Simülatör yeni dünya kuruyor, istemcide Enter ana menüye dönüyor.
- Anomali 3 reddedildi: çaylağın dipte kalması gerçekçi bir davranış.
- `sim.js`'deki çift hata sayacı hiç artmıyordu, çünkü çift hata bir `point` olayı. Düzeltildi.
