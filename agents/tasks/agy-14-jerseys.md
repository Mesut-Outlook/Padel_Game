# Görev agy-14: Forma çeşitleri (yaka, kolsuz, desen)

Sen Antigravity ajanısın; Claude Opus yönetici ve reviewer. Kullanıcı isteği: "bazı oyuncuların shirtleri farklı olsun".
İzinli komutlar: `ls cat find node "npm test" "npx vite build" wc sed`. **Commit ATMA.** Rapor: `agents/reports/agy-14-jerseys.md`.
Bitiş: **2026-10-19 Pazartesi 01:30'dan önce** (Opus 02:00'de review edip commit'ler, sonra kendi işine başlar).

## Dokunma (Opus'un işi — çakışma olur)
- `index.html` menü/ana ekran, `src/menu.js`, `src/main.js`, `src/game.js`, `src/career.js`, `src/tournament.js`.
- `data/shop.json`'da **yalnız `type: "kit"` satırlarını** değiştir/ekle; başka tür ekleme (Opus `fuel` ürünleri ekleyecek).
- `src/careerui.js`'de yalnız kit kartı (Shop → Kit sekmesi, ~1439) ve kariyer maçında `outfit` kurulan yer (~220-230). Shop sekmeleri ve Locker yuvalarının yapısını değiştirme.

## Veri şeması
`outfit` (karakterde ve kit ürününde) üç yeni isteğe bağlı alan alır; yoksa bugünkü forma çıkar:
- `style`: `"crew"` (varsayılan, bugünkü yuvarlak yaka) · `"polo"` (yaka bandı + göğüste 2–3 düğmeli pat şeridi) · `"vneck"` (V yaka, ~6 cm derin) · `"tank"` (kolsuz atlet, omuz askısı)
- `pattern`: `"none"` (varsayılan) · `"chest"` (göğüste yatay şerit) · `"sash"` (sağ omuzdan sol kalçaya çapraz kuşak) · `"side"` (yanlarda dikey panel)
- `accent`: `#rrggbb` — desen ve polo yaka rengi; yoksa bugünkü trim rengi.

## Uygulama (`src/player.js`)
- `SHIRT` / `SHIRT_GLSL` stile göre parametreli olsun: `vneck` boyun kesimini öne doğru V yapar; `tank` kol bölgesini atar (`ax < 0.2`, koltuk altı açık). **Gövde boyası (`kitMaterial`, satır ~224) ve kumaş (`makeGarment`) aynı bölgeyi kullanmalı**, yoksa formanın altından ten ya da üstünden boya görünür.
- Desen ve polo yakası `trimTest` / ek GLSL ile `aRest` (bind-pose) konumundan boyanır — yeni geometri yok, doku yok.
- `customProgramCacheKey` stil+deseni içersin; çeşit sayısı küçük kalsın (HD 620: 4 stil × 4 desen × 2 cinsiyet üst sınır).
- `kitColors`'taki "ten rengine yakınsa beyaz yap" kuralı korunur.

## Karakterler ve market
- `data/characters.json`: 26 karakterin **yaklaşık 10'una** farklı stil/desen ver (karışık: polo, V yaka, kolsuz kadın ve erkek, birkaç desen). Kalanlar crew kalsın.
- `data/shop.json` kit ürünleri: mevcut 7 kite uygun stil/desen ekle + **6 yeni kit** (her stil en az bir kez). Fiyat/kilit mevcut kit merdiveniyle uyumlu: amateur 150, club 400, regional 900, national 1500, elite 4000 civarı; desenli/polo bir kademe pahalı.
- `src/careerui.js`: kit kartında stil adı ("Polo · chest stripe") + renk örnekleri; kariyer maçında kitin `style/pattern/accent`'i `outfit`'e geçsin. Önizleme Locker'da anında güncellenir.

## Online
- `server/server.js` `sanitizeLook`: `outfit.style` ve `outfit.pattern` bilinen değerler listesinden (`ONE_OF` gibi), `outfit.accent` `COLOR` ile. Bilinmeyen değer düşer.

## Testler (`npm test` yeşil kalmalı)
- `test/server.test.js`: bilinen stil/desen/accent geçer, bilinmeyen (`"hoodie"`, `"red"`) düşer.
- `test/shop.test.js`: her kit ve her karakterin `style`/`pattern`'ı izinli listede.

## Doğrulama (raporda dürüst yaz)
- `npm test`, `npx vite build` çıktısı.
- Görsel doğrulama yapamadıysan "yapamadım" yaz — Opus tarayıcıda bakacak. Hangi karakterlere hangi formayı verdiğini tablo olarak listele.
