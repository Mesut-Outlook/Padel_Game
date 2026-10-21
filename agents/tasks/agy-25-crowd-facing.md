# Görev agy-25: Seyircilerin Sahaya ve Oyunculara Bakacak Şekilde Yönlendirilmesi

Sen Antigravity ajanısın; Claude Opus reviewer. Commit ve push yapma — yalnızca Opus commit eder.

## Kullanıcı Talebi ve Referans Fotoğraf
- **Kullanıcının ilettiği fotoğraf**: kullanıcının ekran görüntüsü (yerel)
- **Sorun**: Tribündeki seyirciler sahaya dik / korta bakmayan açıda (Z ekseni boyunca `q.identity()`) duruyor. Seyircilerin doğrudan korta ve maça bakması gerekiyor.

## Yapılacak İşler (`src/court.js`)
1. **İnceleme**:
   - Belirtilen ekran görüntüsündeki seyirci konumları ve bakış açıları kontrol edilecek.
   - `src/court.js` içinde `setupImpostorMesh` (satır ~318) ve `updateCrowd` (satır ~382, ~422) fonksiyonlarında `crowdMesh` için `q.identity()` kullanılıyor.
   - `PlaneGeometry` normali +Z olduğu için `q.identity()` ile quadvaryasyonlar kortun uzun kenarı (Z ekseni) yönüne bakıyor.
2. **Yönlendirme**:
   - Yan tribünlerdeki (`occupied[i].seat.side`: +1 ve -1) seyirciler korta doğru dönecek şekilde ayarlanacak (`-side * Math.PI / 2` veya korta/merkeze hafif açı verecek biçimde).
   - Hem ilk yerleşimde (`setupImpostorMesh`) hem de animasyon/tezahürat döngüsünde (`updateCrowd`) yönün korunması sağlanacak.
3. **Doğrulama ve Rapor**:
   - `npm test` çalıştırılacak ve testlerin geçtiği teyit edilecek.
   - Farklı kameralardan (özellikle tribünlerin göründüğü açılardan) ekran görüntüsü alınarak `agents/reports/agy-25/` altına kaydedilecek.
   - Sonuçlar `agents/reports/agy-25-crowd-facing.md` raporuna yazılacak.
