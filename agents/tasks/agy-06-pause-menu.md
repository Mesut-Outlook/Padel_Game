# Görev agy-06: Duraklatma Menüsü Seçeneklerinin Düzeltilmesi

Sen Antigravity ajanısın; Claude Opus reviewer.

Kullanıcı Bildirimi: "oyun duraklatdildiktan sonra cikan seceneklerdeki devam et mac yeniden baslat ve anamenuye don bunlar calismiyor.. hatayi bul ve duzelt"

1. **Hata Analizi (RCA):**
   - Duraklatma menüsündeki "Resume", "Restart match" ve "Main menu" seçeneklerinin neden tıklanamadığını araştır.
   - Fare hover (`onmouseenter`), klavye ve DOM yenileme döngüsünü (DOM churn) incele.
   - Yeniden başlatma sırasındaki asenkron model yükleme ve fizik zaman adımı (`acc`) durumunu kontrol et.

2. **Düzeltmeler (`src/main.js`):**
   - Hover / klavye seçiminde DOM düğümlerini silmek yerine yalnızca `.sel` sınıfını güncelleyen `updatePauseSel()` yapısına geç.
   - Buton tıklama dinleyicilerini (`e.preventDefault()`, `e.stopPropagation()`) güvenceye al.
   - Arka plana tıklandığında menüden çıkılmasını sağla.
   - Maç yeniden başladığında sahne yüklenene kadar (`loadingScene`) döngüyü beklet, fizik ve yavaş çekim zamanlayıcılarını sıfırla.

3. **Doğrulama:**
   - Headless Chrome veya tarayıcı testleriyle ve `npm test` ile doğrula.

Rapor: `agents/reports/agy-06-pause-menu.md`.
