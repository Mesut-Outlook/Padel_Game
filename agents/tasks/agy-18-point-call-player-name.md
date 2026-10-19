# Görev agy-18: Sayı bildiriminde tek oyuncunun adı

Sen Antigravity ajanısın; Claude Opus reviewer. Commit ve push yapma — yalnızca Opus commit eder.

Kullanıcı talebi (2026-10-18): *"her sayi alis ve verislerde iki kisinin adini yaziyorsun anlasilmiyor... kim hata yapti ya da sayi aldiysa o kisiye yaz... ama oyunu ya da seti alanlari bildiriyorsan ikisini birden yazabilirsin.. ornegin mesut direkt cama vurdu ise mesut cama vurdu yaz"*

İzinli komutlar: `ls`, `cat`, `find`, `grep`, `head`, `wc`, `sed`, `node`, `npm test`, `npx vite build`, `git diff`, `git status`. Başka komut çalıştırma. `agy-17` aynı dosyalara (`src/main.js`) dokunuyor olabilir — düzenlemeden önce dosyayı yeniden oku, onun değişikliklerini bozma.

## Bugünkü durum

`src/main.js` → `handleEvents()` → `e.type === 'point'`: `flash(`${team}\n${WHY[e.why] || e.why}`, …)`. `team` = `$('t0')` / `$('t1')` metni, çiftlerde **"Mesut / Mümtaz"**. Hatayı kimin yaptığı anlaşılmıyor.

## İstenen

Sayı bildirimi (her sayı) **tek oyuncunun adını** yazsın:

| `e.why` | Kimin adı | İkinci satır (İngilizce UI) |
|---|---|---|
| `hit opponent wall directly` | son vuran (`lastHitter`) | `hit the glass directly` |
| `bounced own side` | son vuran | `bounced it on own side` |
| `hit own mesh` | son vuran | `hit own fence` |
| `double hit` | son vuran | `double hit` |
| `out` (son vuran **kaybeden** takımda) | son vuran | `hit it out` |
| `out` (son vuran **kazanan** takımda: top karşıda sekti sonra dışarı çıktı) | son vuran | `winner` |
| `double fault` | servisi atan (son `serve` vuruşunu yapan = `lastHitter`) | `double fault` |
| `volleyed serve` | son vuran | `volleyed the serve` |
| `double bounce` | son vuran (kazanan takımda) | `winner` |

- Ad: o oyuncunun karakter adı (`avatars[pid].ch.name`); skor tablosundaki takım adlarıyla aynı yazım.
- Yedek: `lastHitter` yoksa ya da tablodaki beklentiyle çelişiyorsa (ör. hata türü ama son vuran kazanan takımda), bugünkü gibi takım adını yaz. Online maçta da `lastHitter` `hit` olaylarından geliyor — aynı mantık çalışmalı.
- `lastHitter` şu an aynı blokta `null`'a çekiliyor — adı ondan **önce** al (bugün `const hitter = lastHitter;` var, onu kullan).
- Mevcut `kicker` (ör. `🔥 EPIC 12-SHOT RALLY`), ses/`speak()` ve stil puanı davranışları değişmesin.
- **Oyun / set / maç** bildirimleri (oyunu, seti, maçı alan) **takım adlarını** (iki isim) yazmaya devam etsin — onlara dokunma.
- Agy-16'da eklenen `ERRORS` / `isError` / `subjectTeam` mantığını bu tabloya göre sadeleştir; gereksiz kalan kodu sil.

## Test, build, rapor

- Karar mantığını DOM'dan bağımsız küçük bir saf fonksiyona ayır (ör. `pointCall(why, scoringTeam, hitterPid)` → `{ pid | null, text }`; `teamOf` = `pid < 2 ? 0 : 1`), `src/` altında DOM/three içermeyen bir modülde, ve `test/` altına tablodaki her satırı + yedek durumu kapsayan bir test yaz.
- `npm test` ve `npx vite build` geçmeli; son satırları rapora koy.
- Rapor: `agents/reports/agy-18-point-call-player-name.md` — değişen dosyalar/fonksiyonlar. Kodda olmayan bir isim yazma; Opus her ismi grep ile kontrol eder.
