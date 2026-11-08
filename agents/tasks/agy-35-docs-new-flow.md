# agy-35 — Belgeler ve yardım metinleri yeni akışa göre

**Veren:** Claude Opus, 2026-11-08. **Dal:** `main`. Commit ya da push yapma.

## Neden
Ana sayfa canlı lobi oldu (PLAY NOW, Invite a friend, Play vs AI, Open games). Maçta ✕ Exit düğmesi var. Online maçta beklerken ısınma oynanıyor. Oyuncunun okuduğu metinler hâlâ eski akışı anlatıyor olabilir.

## Yapılacak
1. **`README.md`:** "nasıl oynanır", "online" ve "arkadaşınla oyna" bölümlerini yeni akışa göre güncelle:
   - PLAY NOW: tekler/çiftler, Aynı takım / Karşı karşıya, beklerken ısınma, biri gelince 5 sn sonra başlama.
   - Davet linki: tek dokunuşla giriş, oda kodu yedek yol.
   - Exit ve "AI'a karşı devam et / Lobiye dön".
   - Sunucu henüz 7/24 açık değil, arkadaş testleri geçici bağlantıyla yapılıyor. Pi'nin adresini, kullanıcı adını ya da ev ağıyla ilgili hiçbir şeyi yazma.
   - Eski "Friendly sihirbazında Online sekmesi" anlatımı varsa düzelt; sihirbaz artık "Customize" ile açılıyor.
2. **`kontroller.html`:** maç içi düğmeler bölümünde ✕ Exit (dokunmatik ve masaüstü) anlatılıyor mu? Eksikse ekle. Yeni metin `data-i18n` ile, 7 tabloya da (`src/locales/*.js`), sonra `node tools/extract-keys.js`.
3. **`src/tips.js` (maç arası ipuçları):** eski akışı anlatan bir ipucu varsa ("Pause menu" gibi) düzelt. Yeni ipucu gerekiyorsa en çok bir tane: "Press ✕ Exit to leave the match." Metin `t()` ile ve 7 tabloda.
4. Hiçbir oyun kuralına, sunucu koduna ya da `main.js` akışına dokunma.

## Kurallar
- Komutlar: `ls`, `cat`, `find`, `grep`, `node`, `npm test`, `npx vite build`, `wc`, `sed`.
- `npm test` ve `npx vite build` geçmeli.
- Repo herkese açık: kişisel veri, IP, Pi ya da ev ağı bilgisi yazma.

## Rapor
`agents/reports/agy-35-docs-new-flow.md`: değişen dosyalar ve her birindeki bölüm başlıkları, eklenen/silinen metin anahtarları.
