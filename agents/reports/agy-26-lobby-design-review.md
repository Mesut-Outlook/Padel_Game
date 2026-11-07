# agy-26 — Canlı Lobi Tasarımı İncelemesi (`2026-11-07-live-lobby-design.md`)

## 1. Oyuncu Deneyimi (Akış ve Dokunuş Sayısı)
- **Doubles'ta 2. soru yerine tek ekranda 3 büyük seçenek:** `PLAY NOW` → `Singles` / `Doubles` ardından tekrar `Team up` / `Face off` sormak 3. bir adım ekliyor. Bunun yerine `PLAY NOW` basılınca açılan tek seçim penceresinde doğrudan 3 kart gösterilmeli:
  1. **Singles (1v1)**
  2. **Doubles · Team Up** *(2 insan birlikte AI'a karşı)*
  3. **Doubles · Face Off** *(1+AI vs 1+AI, 4 insana kadar)*
  Böylece seçim **2 dokunuşta** biter ve yeni oyuncu aradaki farkı tek bakışta görür.
- **Ana sayfada "Ben kimim?" rozeti:** İsim ve karakter ilk kez otomatik atanacağı için (`Player 4821` + rastgele karakter), sol sütunda `PLAY NOW` üstünde küçük bir **Oyuncu Rozeti** (`🇹🇷 Mesut · ✎`) bulunmalı; tıklayınca aynı ekranda küçük bir çekmeceyle isim ve 9 karakterden biri tek dokunuşla değiştirilebilmeli (4 adımlı sihirbaza girmeden).
- **Isınma maçından online maça geçiş (5 sn geri sayım):** Isınma maçındayken ikinci oyuncu katıldığında geri sayım başlarken ekranda kimin hangi takımda olduğu (`🇪🇸 Carla joined! Starting in 5…`) net görünmeli. "Host declined" düğmesi yanlışlıkla basılmaması için küçük/ikincil tutulmalı; aslında açık (`public`) bir `PLAY NOW` odasında reddetme düğmesi yerine yalnızca **✕ Exit** yeterli ve daha az kafa karıştırıcı olur.
- **Invite a friend akışı:** "Invite a friend" basıldığında tekrar Singles/Doubles sormak yerine varsayılan olarak **Doubles** (2 kişi girerse karşılıklı/birlikte, 3-4 kişi girerse tam kadro) oda açıp linki anında paylaşmalı/kopyalamalı ve oyuncuyu doğrudan ısınma kortuna sokmalı.

## 2. Görsel Yön (Açık Tema + Intel HD 620 Dostu)
- **Renk Paleti ("Daylight Club" teması):**
  - Zemin: Düz beyaz yerine göz yormayan sıcak kırık beyaz / kort kumu tonu (`#F4F6F8` ana zemin, `#FFFFFF` kart yüzeyi, `#E2E8F0` `1px` ince kenarlık).
  - Metin: Koyu lacivert-antrasit (`#0B1520` ana başlık, `#475569` ikincil metin).
  - Vurgu: Mevcut neon padel sarısı (`#D8F53A`) beyaz zeminde tek başına soluk kalır ve okunmaz; bu yüzden birincil aksiyon (`PLAY NOW`, `Join`) için **kort mavisi (`#1E5EFF` veya `#2F6FB5`) zemin üzerine beyaz yazı** ya da **koyu lacivert (`#0B1520`) zemin üzerine `#D8F53A` fosforlu vurgu** kullanılmalı.
- **Tipografi (`public/fonts/`):** Mevcut `Barlow Condensed` (700/800) büyük harf başlıklar, rozetler ve `PLAY NOW` için çok güçlü bir spor yayını havası veriyor; açık maç listesi (`Open games`) satırlarında ise okunaklı `system-ui` + `tabular-nums` (`1/2`, `2/4`) kullanılmalı.
- **Kart Biçimi ve Hafif Animasyonlar (`backdrop-filter` olmadan):**
  - Açık temada `backdrop-filter: blur()` yerine hafif katmanlı gölge (`0 4px 14px rgba(11,21,32,0.06)`) kullanmak Intel HD 620'de GPU dolgu hızını (fill-rate) korur.
  - `Open games` satırlarında bekleyen odalar için yalnızca CSS `opacity/scale` kullanan küçük yeşil canlı nokta (`● Waiting`) ve kart üzerine gelince `translateY(-2px)` yeterli.

## 3. Kodla Çelişen Noktalar ve Teknik Riskler (Dosya & Satır)
- **Isınma maçı (`world`) ile Online lobi (`net`) çakışması — [`src/main.js:283`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/main.js#L283) ve [`src/main.js:1049`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/main.js#L1049):**
  1. `loop()` içinde `else if (net)` ([`src/main.js:1049`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/main.js#L1049)) kontrolü var. Lobi beklerken `net` nesnesi dolu olduğu için `net.view()` `null` döner ve `loop()` erken çıkar; yani **yerel ısınma maçı (`world`) hiç ilerlemez/çizilmez**. Koşul `else if (net && net.lobby?.started)` olmalı.
  2. Online maç başladığında [`src/main.js:283`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/main.js#L283) satırındaki `if (l.started && !avatars.length)` kontrolü, ısınma maçından kalan `avatars` dizisi dolu olduğu için **yeni online sahneyi kurmaz (`setupScene` çağrılmaz)**. Geçiş anında `world = null` yapılmalı ve sahne yeniden kurulmalı.
- **24 karakter arşivlenince Kariyer Turnuvaları çöker — [`src/careerui.js:2339-2363`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/careerui.js#L2339-L2363) ve [`src/tournament.js:26`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/tournament.js#L26):**
  - Taslakta (madde 72) *"AI rakip havuzu arşivlenmişleri atlar"* deniyor. Ancak `data/tournaments.json` içindeki turnuvalar `drawSize: 8` ve `drawSize: 16` çift (14 ila 30 AI oyuncu) istiyor.
  - Eğer `availablePartners(profile)` ([`src/careerui.js:1257`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/careerui.js#L1257)) yalnızca 9 aktif karakteri döndürürse, oyuncu ve partneri çıkarılınca havuzda `p.length = 7` kalır. [`src/careerui.js:2354`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/careerui.js#L2354) satırında `i = 3` olduğunda `2 * i + 1 < p.length` (`7 < 7`) yanlış olur, `else` dalında `offset = (3 - 12) * 2 = -18` ve `p[(-18 + 5) % 7] = p[-6] = undefined` olup **`TypeError` ile tüm çiftli turnuvalar çöker**.
  - **Çözüm:** Seçim menülerinde yalnızca 9 aktif karakter gösterilmeli, fakat **Kariyer turnuva/sıralama AI havuzu (`availablePartners` / `aiRankingTable`) 33 karakterin tamamını** kullanmaya devam etmeli (veya negatif modulo düzeltilmeli).
- **Seyirci (`crowdatlas.js`) arşivden etkilenmez — [`src/crowdplan.js:12-121`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/crowdplan.js#L12-L121):**
  - Taslakta (madde 72) *"kalabalık/billboard atlası arşivlenmişleri atlar"* denmiş; ancak `crowdLooks()` `data/characters.json` dosyasını okumaz, `src/crowdplan.js` içindeki sabit `BASE_LOOKS` (16 özel seyirci görünümü) dizisini kullanır. Orada değişiklik gerekmez.
- **Sol üstteki `✕ Exit` düğmesi ile `#hud` skor tablosu çakışması — [`index.html:723`](file:///home/mesuto/Documents/PROJELER/Padel_Game/index.html#L723) ve [`src/touch.js:26`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/touch.js#L26):**
  - Skor tablosu (`#hud`) şu an `top: 10px; left: 10px` konumunda ([`index.html:723`](file:///home/mesuto/Documents/PROJELER/Padel_Game/index.html#L723)). Sol üste her zaman görünür `✕ Exit` konduğunda sayı aralarında `#hud` ile üst üste biner. `#hud` `left: 96px` (veya `top: 52px`) kaydırılmalı ve [`src/touch.js:26`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/touch.js#L26) içindeki `TOP` dizisinden `['Escape', '⏸', N_('Pause')]` çıkarılmalı.
- **Sunucuda `m.char` dizi indeksidir — [`server/server.js:18`](file:///home/mesuto/Documents/PROJELER/Padel_Game/server/server.js#L18), [`server/server.js:276`](file:///home/mesuto/Documents/PROJELER/Padel_Game/server/server.js#L276):**
  - Sunucu `m.char` değerini `0..CHARACTERS-1` dizi indeksi olarak saklar. Menüler 9 aktif karakteri filtrelediğinde bile `startOnline` çağrısına yerel filtre indeksi (`0..8`) değil, karakterin `data/characters.json` içindeki **gerçek dizi indeksi** (`characters.indexOf(ch)`) gönderilmelidir.

## 4. İş Bölümü (Hangileri agy İçin Uygun?)
- **agy'nin rahatlıkla üstlenebileceği işler:**
  1. **Açık tema CSS & Canlı Lobi UI (`index.html`, `src/home.js`, `src/lobbyview.js`):** İki sütunlu yeni lobi ekranı, `PLAY NOW` / `Open games` kartları ve açık renk tema dönüşümü.
  2. **`✕ Exit` düğmesi ve oyun içi çıkış/duraklatma penceresi (`index.html`, `src/touch.js`, `src/main.js`):** Sol üst `✕ Exit`, `#hud` hizalaması, `TOP` barından `⏸` kaldırma ve onay modalı.
  3. **9 aktif karakter + 4 yeni karakter görünümü ve bekleyen duruş/portre pozları (`data/characters.json`, `src/player.js`, `src/thumbs.js`, `tools/posetest.html`):** Arşivleme bayrağı, 6 düz / 3 sağa dönük duruş ve açık temaya uygun portre arka planları (`src/thumbs.js:99`).
- **Opus veya Sonnet'te kalması daha doğru olan işler:**
  - `server/server.js` protokol ve güvenlik (R1–R8) değişiklikleri (Opus kuralı).
  - `src/main.js` içindeki **ısınma maçı (`world`) → canlı online maç (`net`) sahne devri** (hem `main.js` hem `net.js` durum makinesine dokunduğu için tek merkezden yazılması daha güvenli).
