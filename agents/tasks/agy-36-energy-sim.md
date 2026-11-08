# agy-36 — Enerji ayarı: simülasyon ve öneri (oyun koduna dokunma)

**Veren:** Claude Opus, 2026-11-08. **Dal:** `main`. Commit ya da push yapma. **`src/game.js`, `physics.js`, `rules.js`, `ai.js` dosyalarını değiştirme.** Bunlar sunucuyla ortak kullanılıyor; değeri Opus değiştirecek.

## Sorun (README yol haritası)
"Enerji değerlerinin oynayarak ince ayarı": simülasyonda kulüp AI'ı nadiren yoruluyor, efsane AI'ı uzun rallilerde ortalama ~0.5'e iniyor.

## Durum (kodda)
- `src/game.js`: `ENERGY = { run, stroke, smash, rallyFrom, rallyStep, rallyMax, rest, drink, slow, miss, soft, reach }`, `tire()`, `HYDRATION`.
- `tools/sim.js`: AI'a karşı AI maç simülasyonu (bak, nasıl çalıştığını oku).
- Önceki denge raporu: `agents/reports/agy-02-balance-sim.md`.

## Yapılacak
1. `tools/energy-sim.js` yaz. Kendi kopyasında `ENERGY`'yi değiştirerek dene: `game.js`'ten import et, nesnenin alanlarını betik içinde geçici olarak üzerine yaz; dosyayı değiştirme. Her AI seviyesi (`rookie`, `club`, `pro`, `legend`) için en az 20 maç (tekler ve çiftler) oynat ve şunları ölç:
   - set sonunda ortalama ve en düşük enerji,
   - enerjinin 0.5 altında geçen süre yüzdesi,
   - 0.3 altına düşen oyuncu yüzdesi,
   - ortalama ralli uzunluğu.
2. Bugünkü değerlerle bir taban tablo çıkar.
3. Hedef (oyun hissi): uzun bir sette her seviye **biraz** yorulsun. Kulüp seviyesi set sonunda ~0.6–0.7, efsane uzun rallilerde ~0.5 değil ~0.55–0.65 civarında. Kimse maçın yarısını 0.3 altında geçirmesin. Bu hedefe en yakın 2–3 değer setini dene ve karşılaştır. Örneğin `rest`, `rallyStep` ve `run` ile oyna; seviyeye özel bir şey gerekirse (AI daha az koşuyorsa) bunu raporda açıkla.
4. Önerini tek bir `ENERGY = {…}` satırı olarak yaz.

## Kurallar
- Komutlar: `ls`, `cat`, `find`, `grep`, `node`, `npm test`, `npx vite build`, `wc`, `sed`.
- Yeni dosya yalnızca `tools/energy-sim.js` ve rapor. `npm test` geçmeli.
- Sayıları uydurma: her tablo `node tools/energy-sim.js …` çıktısından gelsin, komutu ve maç sayısını raporda yaz.

## Rapor
`agents/reports/agy-36-energy-sim.md`: taban tablo, denenen değer setleri ve tabloları, önerilen `ENERGY` satırı, kullanılan komutlar ve süreleri.
