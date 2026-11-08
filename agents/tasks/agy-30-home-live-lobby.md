# agy-30 — Ana sayfa = canlı lobi (görsel düzen)

**Veren:** Claude Opus, 2026-11-08. **Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md`, hedefler 1–3, "Opus'un kararları", "İnceleme sonrası netleştirilenler" (oku). **Önce:** agy-29 (açık tema) bitmiş olmalı; onun CSS değişkenlerini kullan. **Dal:** `main`. Commit ya da push yapma.

## Sınır
Bu iş **yalnızca `src/home.js` ve `index.html` içindeki `#home` / `.hm-*` CSS'i.** Ağ, maç başlatma ve ısınma maçı Opus'ta: `home.js` bunları yalnızca geri çağırma (callback) ile ister, hiçbir yere bağlanmaz, `net.js` import etmez.

## Düzen (taslak B)
- **Sol sütun:**
  - Üstte kalıcı seçici `[Singles | Doubles]`. Doubles seçiliyken altında ikinci kalıcı seçici `[Team up | Face off]`. Seçicinin yanında kısa bir açıklama: Doubles için `Empty seats are played by the AI.`; Team up = `You and another player vs two AI players.`; Face off = `You against another player, each with an AI partner.`
  - Seçim `localStorage` `padel.quick.v1` = `{ players: 2|4, mode: 'team'|'face' }` içinde hatırlanır (try/catch; okunamazsa Singles).
  - Altında büyük **PLAY NOW** düğmesi (koyu zemin + limon `#d8f53a`, sayfadaki tek limon öğe).
  - Onun altında iki ikincil düğme: **Invite a friend**, **Play vs AI**. Play vs AI'ın yanında küçük **Customize** linki (mevcut sihirbaz).
- **Sağ sütun — Open games:**
  - Başlık `Open games` ve canlı bir nokta.
  - Her satır: karakterin bayrağı (`src/flags.js`), takma ad, tür (`Singles 1/2`, `Doubles · Team up 1/2`, `Doubles · Face off 2/4`), sağda **Join** düğmesi.
  - Boşken: `Nobody is waiting right now — be the first.`
  - Sunucu yokken (`serverReady === false`): `Online play is not open yet.` ve PLAY NOW / Invite a friend pasif değil, yine tıklanır (Opus o durumda kullanıcıya mesaj gösterecek).
- **Sağ üstte isim rozeti:** `Player 4821 ✎`. Dokununca yerinde düzenlenir (`<input maxlength="16">`). Yanında küçük not: `Visible to other players — don't use your real name.` Değer `padel.onlineName` içinde saklanır. Boşsa ilk açılışta `Player ` + 4 rastgele rakam üretilir ve kaydedilir.
- **Alt çubuk (küçük linkler):** Career, Training, Settings, Controls, Fullscreen, Privacy, ✉ contact@padellegends.eu. Bugünkü "SELECT GAME MODE" kartları ve "Friends Cup" kartı kalkar. `HOWTO` resimleri kalabilir ama sayfanın altında küçük.
- **Telefon:** iki sütun alt alta, önce sol (PLAY NOW). Yatay telefonda (yükseklik < 500 px) kaydırmadan PLAY NOW görünmeli.
- **Kumanda:** mevcut `spatialFocus` / `padDir` gezinmesi bütün düğmelerde çalışsın; A = tıkla.

## home.js arayüzü (Opus bunlara bağlanacak — adları değiştirme)
```js
initHome({ onPlayNow({ players, mode }), onInvite({ players, mode }), onJoin(code), onPlayAI(), onCustomize(),
           onCareer(), onTraining(), onOpenSettings(), onOpenControls(), onOpenProfile() })
export function setOpenGames(rows, serverReady)  // rows: [{ code, players, mode, free, host, char }] (net.js listRooms biçimi); char = characters.json indeksi
export function getOnlineName()                   // rozetteki ad
export function getQuickPick()                    // { players, mode }
```
- `setOpenGames` yalnızca listeyi yeniden çizer, sayfanın geri kalanını değil (odak kaybolmasın, DOM çalkalanmasın).
- Satırdaki ad ve kod **mutlaka kaçışlanır** (`textContent` ya da `&<>"'` kaçışı). Liste başka birinin sunucusundan gelebilir.
- Bayrak için karakteri `data/characters.json`'dan indeksle oku (`characters[char]?.countryCode`); yoksa bayrak gösterme.
- `onFriendly` geri çağırması `onCustomize` olur. `main.js` içindeki `initHome({...})` çağrısında yalnızca bu adı ve yeni boş geri çağırmaları ekle (`onPlayNow: () => {}` gibi; Opus dolduracak). `main.js`'in başka yerine dokunma.

## Metinler
Yeni metinler `t('…')`, hepsi 7 tabloda (`src/locales/*.js`), sonra `node tools/extract-keys.js`. Kullanılmayan eski HOME anahtarlarını (`SELECT GAME MODE`, `FRIENDS CUP`… başka yerde yoksa) tablolardan sil. Türkçe öneriler: PLAY NOW = "HEMEN OYNA", Invite a friend = "Arkadaşını davet et", Play vs AI = "AI'a karşı oyna", Customize = "Özelleştir", Open games = "Açık maçlar", Join = "Katıl", Team up = "Aynı takım", Face off = "Karşı karşıya", Singles = "Tekler", Doubles = "Çiftler".

## Kurallar
- Komutlar: `ls`, `cat`, `find`, `grep`, `node`, `npm test`, `npx vite build`, `wc`, `sed`.
- `npm test` ve `npx vite build` geçmeli.
- HD 620: `backdrop-filter` yok, ağır arka plan efekti yok, animasyon yalnızca `transform`/`opacity`.
- Dış kaynak yok. `confirm/alert/prompt` yok.
- `src/game.js`, `physics.js`, `rules.js`, `ai.js`, `server/`, `src/net.js` dosyalarına dokunma.

## Rapor
`agents/reports/agy-30-home-live-lobby.md`: değişen dosyalar ve dışa açılan fonksiyonlar, `npm test` / `npx vite build` son satırları, masaüstü ve telefon genişliğinde ekran görüntüleri (`agents/reports/agy-30/`; alamadıysan açıkça yaz).
