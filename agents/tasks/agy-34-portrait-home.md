# agy-34 — Telefonda dikey ana sayfa

**Veren:** Claude Opus, 2026-11-08. **Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md`, hedef 1: "Telefonda iki sütun alt alta (önce PLAY NOW, sonra liste)". **Dal:** `main`. Commit ya da push yapma.

## Sorun (agy-33 bulgu 5)
Dokunmatik bir telefon dikey tutulunca `#rotate` ("ROTATE YOUR PHONE") bütün ekranı kaplıyor. Bu ana sayfada da oluyor, kural `index.html` içinde `@media (orientation: portrait)` + `body.touch`. Ama ana sayfa dikeyde kullanılabilir olmalı. Maç ise yatay kalır.

## Yapılacak
1. `#rotate` **yalnızca ana sayfa görünmüyorken** çıksın: maçta, sihirbazda ve kariyerde bugünkü gibi çıkar, `#home` görünürken çıkmaz. CSS ile çöz, örneğin `body:has(#home:not([hidden])) #rotate { display: none }`. JS gerekmez.
2. Dikey telefonda (390×844, 360×740) ana sayfa:
   - Sütunlar alt alta: üstte seçiciler ve PLAY NOW, altta Open games.
   - Kaydırma gerekirse sayfa dikey kaydırılır. `html, body { overflow: hidden }` olduğu için `#home` kendi içinde kaydırılmalı (`overflow-y: auto`).
   - PLAY NOW ilk ekranda, kaydırmadan görünür.
   - Düğmeler en az 44 px yüksek (ya da agy-33 düzeltmesindeki gibi görünmez dokunma şeridi).
   - İsim rozeti ve "Visible to other players…" notu taşmasın.
   - `HOWTO` resimleri dikeyde gizlenebilir.
3. PLAY NOW / Join / Play vs AI ile maç başlayınca telefon hâlâ dikeyse `#rotate` çıkar (beklenen davranış, maç yatay).

## Kurallar
- Komutlar: `ls`, `cat`, `find`, `grep`, `node`, `npm test`, `npx vite build`, `wc`, `sed`.
- `npm test` ve `npx vite build` geçmeli.
- Yalnızca `index.html` (`#home`, `.hm-*`, `#rotate` kuralları) ve gerekirse `src/home.js`. Başka dosyaya dokunma. Yeni metin yok. `backdrop-filter` yok.

## Rapor
`agents/reports/agy-34-portrait-home.md`: değişen kurallar, 390×844 ve 360×740 ekran görüntüleri (`agents/reports/agy-34/`), maç başlayınca `#rotate`'in çıktığının kontrolü. Denemediysen açıkça yaz.
