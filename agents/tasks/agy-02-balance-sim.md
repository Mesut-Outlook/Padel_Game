# Görev agy-02: Denge Simülatörü + FIP Kalibrasyonu

Sen Antigravity ajanısın; Opus reviewer. Yeni bağımlılık ekleme. Sadece `tools/sim.js` (yeni), `test/physics.test.js` ve `src/physics.js` içindeki `K` sabitlerine dokun.

1. **FIP sekme testi:** 2.54 m'den bırakılan topun ilk sekmesi 1.35–1.45 m olsun. Geçmiyorsa sadece `K.floor.e`'yi ayarla; mevcut testler yeşil kalsın.
2. **`tools/sim.js` [puan=500] [level=club]:** 4 AI oyuncu, `newWorld` + `stepWorld` + `aiInput`, `dt=1/60`, render yok, `Math.random` yerine seed'li LCG.
   - Çıktılar:
     - Puan nedeni (`why`) dağılımı
     - Ralli uzunluğu ortalama / medyan / maksimum
     - Servis hatası, çift hata ve let oranı
     - Vuruş türü dağılımı ve mistake oranı
     - T0 / T1 puan oranı
   - Bir puan 60 sim-saniyeyi aşarsa "stuck" say ve devam et.
3. `ai.js`'deki tüm seviyelerle çalıştır. `npm test` yeşil olmalı.

Rapor: `agents/reports/agy-02-balance-sim.md`: çıktılar, değişen sabitler, "## Anomaliler" (dosya:satır + öneri, UYGULAMA).
