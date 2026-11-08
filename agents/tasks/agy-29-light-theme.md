# agy-29 — Açık renk tema (maç dışı ekranlar)

**Veren:** Claude Opus, 2026-11-08. **Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md`, hedef 7 ve "Antigravity görüşünden alınanlar" → Renk, HD 620 (oku). **Dal:** `main`. Commit ya da push yapma.

## Hedef
Maç dışındaki bütün ekranlar açık renk olacak: splash, HOME (`src/home.js`), Friendly sihirbazı (`src/menu.js`), kariyer ekranları (`src/careerui.js`), ayarlar (`src/settings.js`), online lobi (`src/lobbyview.js`), `privacy.html`, `kontroller.html`. Zemin beyaz ya da kırık beyaz (`#f7f8fa` gibi), yazı koyu (`#0f172a` gibi). **Maç içi değişmez:** `#hud`, `#pause`, `#help`, `#touchUi`, `#replayTag`, `#cam`, maç sonu skor ekranı, 3D sahne.

## Kurallar (renk)
- Önce `index.html` içindeki `:root` değişkenlerini genişlet ve renkleri değişkenlerle kullan: `--bg`, `--fg`, `--card`, `--border`, `--muted`, `--acc` (açık zeminde doygun yeşil `#16A34A`), `--court` (kort mavisi). Sabit koyu renkleri (`#0b1520`, `rgba(10,18,28,…)`, `#fff` yazı) maç dışı seçicilerde değişkene çevir. Maç içi seçiciler kendi koyu renklerini korusun. Gerekirse oyun içi için `--hud-bg` gibi ayrı bir değişken tut.
- Limon `#d8f53a` yalnızca koyu zeminli birincil düğmede (START MATCH, HOME'daki ana düğme) kalır. Beyaz zemin üzerinde limon yazı ya da ince limon çizgi olmaz.
- Okunurluk: gövde yazısı zemine karşı en az 4.5:1 kontrast. Gri yardımcı yazılar da (`--muted`) beyaz üzerinde okunur olmalı (`#475569` gibi).
- `<meta name="theme-color">` açık renge döner. `public/manifest.webmanifest` içindeki `background_color` / `theme_color` de.
- 3D önizleme sahnesinin (`menu.js` preview, `thumbs.js` portre arka planı) zemini açık temaya uyabilir. Yeni ışık ya da render geçişi ekleme.

## Kurallar (HD 620)
- `index.html` içindeki bütün `backdrop-filter` satırlarını (13 tane) kaldır. Yerine opak kart, ince kenarlık (`1px solid var(--border)`) ve en çok tek hafif gölge kullan.
- Animasyonlar yalnızca `transform`/`opacity`.

## Kurallar (genel)
- Çalıştırabileceğin komutlar: `ls`, `cat`, `find`, `grep`, `node`, `npm test`, `npx vite build`, `wc`, `sed`.
- `npm test` ve `npx vite build` geçmeli.
- Yeni arayüz metni yok. Düzen, yerleşim ve metinler değişmez; bu iş yalnızca renk, kenarlık ve gölge.
- `src/game.js`, `physics.js`, `rules.js`, `ai.js` ve `server/` dosyalarına dokunma.
- Dış kaynak (font, CDN) ekleme.

## Rapor
`agents/reports/agy-29-light-theme.md`:
- değişen dosyalar, eklenen CSS değişkenleri,
- kalan sabit koyu renkler ve bunların maç içi olduğu (grep ile listele),
- `npm test` / `npx vite build` son satırları,
- hangi ekranları tarayıcıda gördün. Ekran görüntüleri `agents/reports/agy-29/` içine. Görmediysen açıkça yaz.
