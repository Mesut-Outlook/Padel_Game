# Görev agy-23: Gerçek insan görünümlü seyirciler + ülke bayrakları

Sen Antigravity ajanısın; Claude Opus reviewer. Commit ve push yapma — yalnızca Opus commit eder.

Kullanıcı talebi (2026-10-20): *"seyircileri gerçek insan formatında, güzel kadınlar çoğunlukta olmak üzere o seyirci koltuklarını doldurmasını... bulundukları ülkelere göre, oyunculara göre ya da venue'ya göre bayraklar falan... bunları organize etsin."*

İzinli komutlar: `ls`, `cat`, `find`, `grep`, `head`, `wc`, `sed`, `node`, `npm test`, `npx vite build`, `git diff`, `git status`. Başka komut çalıştırma. Opus aynı anda başka dosyalara dokunuyor olabilir: düzenlemeden hemen önce dosyayı yeniden oku, başkasının değişikliğini bozma.

## Bugünkü durum (Opus kontrolü)

- Seyirci: `src/court.js` `buildVenue()` içinde, `if (venue.crowd > 0)` bloğu. Silindir + küreden yapılmış 4 `InstancedMesh` parçası (bacak, gövde, kafa, saç), 2 yan tribünde 5 sıra, `n = venue.crowd * 300` kişi. Basamaklar gri kutular, koltuk yok.
- Tezahürat: `g.userData.exciteCrowd(intensity)` (sayı/smash'te `src/main.js` ~612–668 çağırıyor) ve `g.userData.updateCrowd(dt)` (her kare, `src/main.js` ~1061). Bu iki isim ve davranışları **aynen kalsın**.
- `buildVenue` iki yerden çağrılıyor: `src/main.js` `setupScene` (maç) ve `src/thumbs.js` ~133 (saha küçük resmi). Küçük resimde seyirci **gerekmez** (hız).
- Karakterler: `src/player.js` `createAvatar(scene, ch, racketColor, racketShape)` (65 kemikli rig, görünüm alanları `data/characters.json` ve `sanitizeLook` ile aynı: `gender`, `hair`, `hairColor`, `skinTone`, `beard`, `outfit {shirt, shorts, shoes, style, pattern, accent}`, `body {type, height, width}`, `glasses`, `headwear`, `makeup`, `ponytail`…). Animasyon klipleri `public/assets/anims/UAL1_Standard.glb` içinde: **`Sitting_Idle_Loop`, `Sitting_Talking_Loop`, `Dance_Loop`, `Jump_Loop`, `Idle_Loop`** var.
- Ülkeler: sahalar `data/venues.json` `countryCode` (ES, AR, SE, IT, TR, QA, MX, NL), oyuncular `data/characters.json` `countryCode` (TR, ES, IT, FR, NL), kariyer oyuncusu ayrıca PT, BR, GB, DE, US seçebiliyor (`src/careerui.js` `buildCountriesList`). Toplam **14 ülke**.
- Donanım hedefi: Intel HD 620. Kurallar (`CLAUDE.md`): pixelRatio ≤ 1.25, tek gölge atan ışık, doku ≤ 1024 px. Yüzlerce iskeletli (skinned) model **çizilemez**.

## İstenen

### 1. Gerçek insan görünümlü seyirciler (sahte 3D değil, oyunun kendi karakterleri)

Yöntem: **impostor (billboard) atlası.** Maç yüklenirken oyunun kendi `createAvatar` modellerinden ~16–24 farklı seyirciyi ekran dışında bir kez çiz (render-to-texture), her birini 2 pozda: **oturan** (`Sitting_Idle_Loop` ya da `Sitting_Talking_Loop`) ve **tezahürat** (`Jump_Loop` / `Dance_Loop` karesi ya da kollar havada). Hepsini tek bir ≤ 1024×1024 atlas dokusuna koy (önden, hafif yukarıdan, şeffaf arka plan). Tribünde her seyirci bir dörtgen: tek `InstancedMesh`, örnek başına atlas hücresi (`InstancedBufferAttribute` ile UV kaydırma), kameraya Y ekseninde dönen billboard → **1 draw call**. `exciteCrowd` gelince hücreyi tezahürat pozuna çevir + mevcut zıplama. Gölge atmasınlar.

- Atlas bir oturumda **bir kez** üretilip bellekte tutulsun (saha değişince yeniden üretme); üretim sırasında eski basit seyirci görünsün, atlas hazır olunca yer değiştirsin (maç başlangıcı beklemesin).
- Ekleme maliyeti HD 620'de maç yükleme süresine en fazla ~1 saniye eklesin; raporda ölç (`performance.now()`).

### 2. Kim oturuyor

- Seyircilerin yaklaşık **%65–70'i kadın** (kullanıcı isteği: güzel kadınlar çoğunlukta). Şık, bakımlı, çekici, birbirinden farklı görünüşler: uzun saç, topuz, at kuyruğu, farklı saç ve ten renkleri, makyaj, güneş gözlüğü, açık hava sahalarında şapka/vizör, renkli tişört ve polo. **Zevkli olsun:** normal bir spor etkinliği seyircisi kıyafeti, açık saçık hiçbir şey yok.
- Erkekler de çeşitli: sakal, kısa saç, gözlük.
- Görünüşler `createAvatar`'ın zaten desteklediği alanlarla tarif edilsin (yeni model ya da dışarıdan asset **indirme**). Seyirci tarifleri saf bir modülde: **`src/crowdplan.js`** (three.js ve DOM importu yok), örneğin `crowdLooks(rand)` → görünüş listesi, `crowdPlan(seatCount, { fill, venueCC, playerCCs }, rand)` → koltuk başına `{ look, flag }`.

### 3. Koltuklar dolsun

- Gri basamakların üstüne basit, instanced koltuklar (oturak + sırtlık, takım/saha renginde).
- Doluluk `venue.crowd`'dan: `0.4 + 0.6 × crowd` oranında koltuk dolu (Doha 0.9 → neredeyse tam). Boş koltuklar rastgele dağılsın.

### 4. Bayraklar

- Bayraklar **canvas'ta çizilsin** (emoji bayrak Windows'ta görünmüyor; dış dosya/CDN yok). 14 ülke: TR, ES, AR, SE, IT, QA, MX, NL, FR, PT, BR, GB, DE, US. Basitleştirilmiş amblemler yeterli (TR ay-yıldız, AR güneş, MX ortada daire, BR elmas + daire, US çizgiler + mavi köşe, GB basit Union Jack, QA tırtıklı kenar). Bilinmeyen kodda bayrak çizme.
- Dağılım: seyircilerin ~%15–20'si küçük bayrak sallasın (seyircinin yanında ayrı küçük instanced dörtgen, tezahüratta sallansın). Bayrakların yaklaşık **yarısı sahanın ülkesi**, **üçte biri sahadaki oyuncuların ülkeleri** (iki takım), kalanı karışık.
- Tribün korkuluklarına 4–6 büyük asılı bayrak/pankart: sahanın ülkesi + oyuncuların ülkeleri.
- `buildVenue(scene, venue, opts)` → `opts = { crowd: true, flags: ['TR', 'ES', …] }`. `src/main.js` `setupScene` oyuncu ülkelerini `roster[id].countryCode`'dan versin (online maçta da `roster` var). `src/thumbs.js` `{ crowd: false }` geçsin.

## Test, build, rapor

- `test/crowdplan.test.js`: sabit tohumlu `rand` ile kadın oranı 0.6–0.75 arası; doluluk formülü; bayrakların yaklaşık yarısı saha ülkesi; bilinmeyen ülke kodu bayraksız; hiçbir görünüşte `createAvatar`'ın bilmediği değer yok (ör. `hair` listesi `server/server.js` `ONE_OF.hair` ile aynı).
- `npm test` ve `npx vite build` geçmeli, son satırları rapora koy.
- Tarayıcıda en az 3 sahada dene (Madrid indoor, Doha arena gece, Antalya beach): ekran görüntüsü al, `agents/reports/agy-23/` altına koy. FPS'i seyircili ve seyircisiz ölç (aynı sahne, ~10 sn ortalama).
- Rapor: `agents/reports/agy-23-crowd.md`: değişen dosyalar ve fonksiyonlar, atlas boyutu, draw call sayısı, yükleme süresine eklenen ms, FPS karşılaştırması, ekran görüntüleri. Kodda olmayan bir isim yazma; Opus her ismi grep ile kontrol eder ve görüntüleri kendisi de tarayıcıda kontrol eder.
