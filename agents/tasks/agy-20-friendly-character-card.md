# Görev agy-20: Friendly karakter kartı (güçlü/zayıf yanlar + oyun ipucu)

Sen Antigravity ajanısın; Claude Opus reviewer. Commit ve push yapma — yalnızca Opus commit eder.

Kullanıcı talebi (2026-10-19, kariyer ilerlemesi isteğinin parçası): *"Friendly'de istenen karakter seçilebilsin; her karakterin güçlü ve zayıf yanları olsun, oyuncuya ipuçları ve nasıl geliştirebileceği söylensin."* Tasarım: `docs/superpowers/specs/2026-10-19-career-progression-design.md` §9 son madde.

İzinli komutlar: `ls`, `cat`, `find`, `grep`, `head`, `wc`, `sed`, `node`, `npm test`, `npx vite build`, `git diff`, `git status`. Başka komut çalıştırma.

**Çakışma uyarısı:** Bir Sonnet ajanı şu an `src/main.js`, `src/input.js`, `src/careerui.js` ve `index.html` dosyalarında çalışıyor (çanta/su arayüzü). Bu dört dosyaya **dokunma**. Yalnızca şunları değiştir / ekle: `src/menu.js`, yeni `src/charcard.js`, yeni `test/charcard.test.js`. Yeni CSS gerekmesin — mevcut sınıfları kullan (`pl-meta-pill`, `pl-stats-list`, `pl-stat-row` …). Düzenlemeden önce dosyayı yeniden oku.

## Bugünkü durum

`src/menu.js` → karakter bilgi paneli (`#pl-char-info`, ~satır 433–457): bayrak, ad, cinsiyet/el etiketleri ve 5 stat çubuğu (`statRow`). **STAMINA** satırı eksik.

## İstenen

1. **Saf modül `src/charcard.js`** (DOM/three yok): `charCard(stats)` →
   `{ strengths: [[key, value], [key, value]], weakness: [key, value], tip: string }`
   - Statlar: `speed, power, control, volley, smash, stamina` (bu sırayla; eşitlikte bu sıradaki ilk stat seçilir).
   - `strengths` = en yüksek 2 stat (büyükten küçüğe), `weakness` = en düşük stat (strengths'te olmayan).
   - `tip` biçimi (İngilizce UI): `"Smash 9 · Control 5 — finish at the net, keep rallies short"` → `"<En güçlü ad> <değer> · <Zayıf ad> <değer> — <güçlü yana göre öneri>, <zayıf yana göre öneri>"`.
   - Güçlü yan önerileri (her stat için bir kısa İngilizce cümle parçası), örnek:
     speed → `chase every ball down`, power → `go for winners with hard drives`, control → `place the ball into the corners`, volley → `take the net early`, smash → `finish at the net`, stamina → `wear them down in long rallies`.
   - Zayıf yan önerileri, örnek:
     speed → `stay central and let your partner cover`, power → `play for placement, not pace`, control → `keep rallies short`, volley → `let the ball bounce off the glass`, smash → `play a bandeja instead of a full smash`, stamina → `keep points short and eat at changeovers`.
   - Metinleri istersen iyileştir ama kısa tut (kart tek satır).
2. **Kart (`src/menu.js` bilgi paneli):** stat listesine **STAMINA** satırını ekle; listenin altına:
   - Güçlü yanlar: iki etiket (`pl-meta-pill`), ör. `💪 SMASH 9` `💪 VOLLEY 8`; zayıf yan: bir etiket `⚠ CONTROL 5`.
   - `tip` satırı (küçük, soluk yazı — var olan bir sınıf ya da inline `style` ile; yeni CSS kuralı ekleme).
   - En altta: `Build your own player in Career →` — tıklayınca `location.hash = '#career'` (menüde `#home` düğmesinin yaptığı gibi).
   - Panel her karakter seçiminde (klavye, pad, fare) güncelleniyor; kart da onunla güncellenmeli.
3. Değerler `data/characters.json` statlarından gelir; roster karakterleri Friendly'de geliştirilmez (kariyerle ilgili kodlara dokunma).

## Test, build, rapor

- `test/charcard.test.js`: güçlü/zayıf seçimi, eşitlikte sıra kuralı, tip biçimi; ve `data/characters.json`'daki **her** karakter için `charCard` boş olmayan bir `tip` üretir.
- `npm test` ve `npx vite build` geçmeli; son satırları rapora koy.
- Rapor: `agents/reports/agy-20-friendly-character-card.md` — değişen dosyalar/fonksiyonlar. Kodda olmayan bir isim yazma; Opus her ismi grep ile kontrol eder.
