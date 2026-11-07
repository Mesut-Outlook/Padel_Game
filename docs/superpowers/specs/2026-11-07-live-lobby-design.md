# Canlı lobi, kolay başlangıç ve 7/24 sunucu — tasarım (2026-11-07)

**Durum:** kullanıcı onayladı (2026-11-07).

## Amaç ve neden

2026-11-07 internet testinde (laptop ev ağında, telefon 5G, sunucu evdeki Pi + Cloudflare quick tunnel) oynanış iyiydi, Pi rahattı (cpu ≤ %9, 62 MB, tick_max 29 ms). Ama kullanıcı oda kurmayı, maça başlamayı ve maçtan çıkmayı çok karışık buldu: Friendly sihirbazında Online seçeneği dördüncü sekmenin içinde gizli, oda kodu ve davet linki elle taşınıyor, telefonda çıkış düğmesi bulunamadı (telefonun 80. saniyedeki kopması büyük olasılıkla tarayıcıyı kapatmaktı).

Kullanıcının hedefi: **insanların birbirini bulup hızla birlikte oynayabildiği bir ortam.** Oyuna üç amaçla girilir: (1) kendi başına AI'a karşı keyfine, (2) şu an bekleyen birinin maçına hızla katılmak, (3) bir arkadaşı kolayca davet etmek. Raket ve saha seçimi zorunlu olmamalı. AI'a karşı kariyer/turnuva daha az değerli: kalır ama ön planda değil. Giriş sayfası ve lobi "en modern, eğlenceli ve kolay" olmalı.

## Hedefler

1. **Ana sayfa = canlı lobi** (kullanıcının seçtiği taslak B):
   - Sol: büyük **PLAY NOW** düğmesi; altında **Invite a friend** ve **Play vs AI**.
   - Sağ: **Open games** — bekleyen açık maçların canlı listesi; her satır: bayrak, isim, tekli/çiftli ve doluluk (örn. `Doubles 2/4`), tek dokunuşla **Join**. Liste kendiliğinden yenilenir. Boşsa "Şu an kimse beklemiyor — ilk sen başla".
   - Kariyer, ayarlar, kontroller, gizlilik, iletişim: küçük linkler.
   - Telefonda iki sütun alt alta (önce PLAY NOW, sonra liste).
2. **PLAY NOW akışı:**
   - PLAY NOW'ın hemen üstünde **kalıcı seçici** `[Singles | Doubles]` (kullanıcı kararı, agy önerisi); Doubles seçiliyken altında ikinci kalıcı seçici `[Team up | Face off]`. Son seçim hatırlanır, PLAY NOW tek dokunuş. Çiftlerde boş yerleri AI'ın dolduracağı seçicinin yanında açıkça yazar.
   - Uyan bir bekleyen maç varsa doğrudan ona girilir.
   - Yoksa açık (listede görünen) bir oda açılır ve oyuncu hemen **AI'a karşı ısınma maçına** girer. Biri katılınca üstte "🇪🇸 Carla joined! Match starts in 5 s" çıkar, ısınma biter, gerçek online maç başlar. Isınma skoru hiçbir yere sayılmaz.
3. **Davet:** Invite a friend → telefonda Web Share (WhatsApp, Mesajlar…), bilgisayarda panoya kopyala. Davet edilen linke dokununca isim ya da oyuncu seçtirilmeden en fazla tek bir **Join** ile maça girer. Davet eden o sırada ısınma maçındadır. Oda kodu yedek yol olarak kalır.
4. **Maçtan çıkış:** sol üstte her zaman görünen, yazılı, beyaz **✕ Exit** düğmesi (telefonda ve bilgisayarda). Basınca oyunun kendi penceresi: **Leave the match? — Leave / Keep playing** (tarayıcının `confirm` kutusu değil). Leave → canlı lobiye döner. AI maçında bu pencere maçı da duraklatır; ayrı ⏸ düğmesi kalkar, duraklatma bu pencereye taşınır. Online maçta maç durmaz. Online'da biri çıkınca karşı tarafa "Mesut left" yazar ve ona **Continue vs AI / Back to lobby** seçeneği gelir. Esc ve kumandanın Start/Options tuşu eskisi gibi çalışır (Exit penceresini açar).
5. **Kadro: 9 oyuncu, 9 ülke.** Mevcut: Mesut 🇹🇷 (p26), Lucía 🇪🇸 (p27), Matteo 🇮🇹 (p25), Camille 🇫🇷 (p28), Daan 🇳🇱 (p31). Yeni: Tomás 🇦🇷 (e), Lena 🇩🇪 (k), Diogo 🇵🇹 (e), Elin 🇸🇪 (k). Diğer 24 oyuncu **arşivlenir**: `data/characters.json` içinde kalır, menülerde görünmez; arşivlenmiş bir karakteri kullanan kariyer profili, online rakip ya da kayıtlı Friendly seçimi bozulmadan çalışır.
6. **Duruşlar:** önizleme ve portrelerde oyuncular farklı duruşta; çoğu düz kameraya bakar, bazıları sağa dönük.
7. **Açık renk tema:** ana sayfa, lobi, sihirbaz ve maç dışındaki bütün ekranlar beyaz/kırık beyaz zemin, koyu yazı, vurgu oyunun mevcut yeşil-sarısı.
8. **Güvenlik:** `agents/reports/security-2026-11-07-redteam.md` (gitignore'da) bulguları R1–R8 her biri kodda doğrulanıp kapatılır, her biri için bir test. Yeni açık oda listesinin getirdiği yüzey de (isimlerin yabancılara görünmesi, liste isteği hızı) aynı turda ele alınır.
9. **7/24 sunucu:** güvenlik bulguları kapandıktan ve güvenlik denetçisi (`.claude/agents/security-auditor.md`) temiz dedikten sonra Pi kalıcı olarak açılır: kalıcı Cloudflare tüneli, `padellegends.eu` altında sabit bir adres, `DEFAULT_SERVER` bu adrese döner, `privacy.html` güncellenir.

## Hedef olmayanlar

- Hesap, giriş, arkadaş listesi, sunucuda profil ya da sıralama (kişisel veri demek; proje kuralı).
- Sohbet/mesajlaşma.
- Maç içi görsellerin (saha, şehir manzarası, HUD) yeniden tasarımı. Beyaz tema yalnızca maç dışı ekranlar. *(Opus'un tahmini; kullanıcı itiraz etmedi.)*
- Kariyer modunun yeniden tasarımı; yalnızca yeni temaya uyar ve ana sayfadan link olarak erişilir.
- Hetzner.

## Başarısızlık sayılacaklar (çalışsa bile)

- Siteyi açan biri, bekleyen bir maç varsa, **1 dokunuştan** fazlasıyla o maça giremiyorsa (seçici zaten doğruysa PLAY NOW; ya da listede Join).
- Davet linkini açan arkadaş isim/oyuncu/raket ekranlarından geçmek zorundaysa.
- Telefonda çıkış yine aranıyorsa.
- Listede gerçek ad, IP ya da tahmin edilebilir oda kodu görünüyorsa; ya da yeni bir üçüncü taraf isteği (font, CDN, analiz) eklenmişse.
- Pi 7/24 açıkken bir hata ev ağına, NAS'a ya da SSH'ye kapı açıyorsa.
- Intel HD 620'de ana sayfa takılıyorsa (pixelRatio ≤ 1.25, ağır arka plan efekti yok).

## Kısıtlar

- `CLAUDE.md` kuralları geçerli: kişisel veri yok, çerez yok, dış kaynak yok (fontlar `public/fonts/`), GoatCounter yalnızca sabit olay adları. Yeni veri akışı → aynı commit'te `privacy.html`.
- `src/game.js`, `physics.js`, `rules.js`, `ai.js` sunucuyla paylaşılır: DOM/three içermez.
- Her yeni UI metni `t('…')` ile ve 7 dil tablosunun hepsine (`test/i18n-keys.test.js`). `t()` anahtarı `${}` ile kurulmaz.
- Online durum: sunucu kodu `server/server.js`; mevcut mesajlar `join` (`create: true` ile oda), `list` → `rooms` (açık lobiler), `start` (yalnızca `room.host`), `input`, `ping`; `LIMITS` Pi'ye göre boyutlu (10 oda, 40 soket). İstemci: `src/net.js`, `src/lobbyview.js`, `src/serverurl.js`, sihirbaz `src/menu.js`, ana sayfa `src/home.js`, rota `src/route.js`, dokunmatik üst çubuk `TOP` (`src/touch.js`).
- Repo herkese açık: Pi'nin adresi, kullanıcı adı, ev ağı ya da NAS hakkında hiçbir şey repoya yazılmaz; güvenlik bulgularının ayrıntısı commit mesajına ya da dokümana yazılmaz.
- Her kural/fizik/sunucu değişikliğine bir test (`npm test`). Yalnızca Opus commit ve push eder; push'tan sonra Pages çalışması kontrol edilir.

## Kullanıcının verdiği kararlar (2026-11-07)

- Ana sayfa = canlı lobi (taslak B).
- Bekleme sırasında AI'a karşı ısınma maçı.
- PLAY NOW önce Singles/Doubles sorar; çiftlerde AI ile oynanacağı bilinerek.
- Önerilen ✕ Exit düğmesi ve onay penceresi.
- 9 oyuncu yukarıdaki liste; diğerleri arşiv.
- Duruşlar: çoğu düz, bazıları sağa.
- Güvenlik sorunları çözülünce Pi 7/24 açılır.
- İş Antigravity (agy) ile paylaşılır; tasarım "en modern, eğlenceli ve kolay".

## Opus'un kararları (kullanıcı onayı bu dokümanla)

- **Listede görünen:** oyuncunun kendi yazdığı takma ad (en çok 16 karakter, mevcut `text()` süzgeci + basit kaba söz süzgeci) ve **seçtiği karakterin bayrağı**. Ziyaretçinin kendi ülkesi sorulmaz. İsim penceresi açılmaz: varsayılan `Player 4821` gibi rastgele bir ad, sağ üstteki rozetten değiştirilir ("visible to other players — don't use your real name"), `padel.onlineName` ile hatırlanır.
- **Açık / özel oda:** PLAY NOW odaları açık listede görünür; Invite a friend odaları listede görünmez (yalnızca linkle girilir).
- **Isınmadan geçiş:** ikinci insan katıldığında 5 sn geri sayım; çiftlerde geri sayım bitene kadar başka insanlar da katılabilir, kalan koltuklar AI. Ev sahibi reddedemez.
- **Play vs AI:** son seçimlerle (`padel.friendly.v1`) hemen başlar; "Customize" linki mevcut 4 adımlı sihirbazı açar. Sihirbaz silinmez.
- **Duruş dağılımı:** 9 kişiden 6'sı düz, 3'ü sağa dönük; her karaktere küçük bir bekleme hareketi (raket omuzda, top sektirme, kollar bağlı gibi), mevcut `UAL1_Standard.glb` kliplerinden ve `player.js` poz ofsetlerinden. Portrelerin (`thumbs.js`) duruşu da buna uyar.
- **Arşiv:** karakterlere `archived: true`; menüler, AI rakip havuzu ve kalabalık/billboard atlası arşivlenmişleri atlar, ama id ile arama her zaman çalışır.
- **Sıra:** önce güvenlik (sunucunun yeni açık liste ve otomatik başlatma davranışı da bu turda yazılır, çünkü ikisi aynı kodu değiştirir), sonra arayüz, en son 7/24.
- **Kalıcı adres:** Cloudflare named tunnel bir Cloudflare alanı ister; bu da `padellegends.eu` DNS'inin Namecheap'ten Cloudflare'a taşınması demek. Namecheap e-posta yönlendirmesi yalnızca Namecheap DNS'iyle çalıştığı için `contact@` → Gmail yönlendirmesi **Cloudflare Email Routing**'e taşınır (ücretsiz; MX/SPF Cloudflare'ın verdiği kayıtlar, DMARC ve CAA eklenir, `_github-pages-challenge-mesut-outlook` TXT ve Pages kayıtları birebir taşınır). Adres `wss://play.padellegends.eu`. DNS değişikliği kullanıcı kendi Namecheap/Cloudflare ekranında, adım adım ve o adımda ayrıca onay alınarak yapılır; `privacy.html` Cloudflare'ın e-postayı da gördüğünü söyler.
- **7/24 işletme:** `padel` ve tünel servisleri açılışta başlar (`enable`); NAS yalıtımı (`InaccessiblePaths=/srv`) korunur; her hafta salt okunur bir sağlık/güvenlik kontrolü; Node ve `cloudflared` elle güncellenir (sürüm kontrolü her güncellemede).

### İnceleme sonrası netleştirilenler (Opus'un kararları)

- **Eşleşme:** PLAY NOW Singles yalnızca bekleyen Singles odalarına, Doubles yalnızca boş koltuğu olan Doubles odalarına girer; uygun oda yoksa yenisini açar. Birden çok uygunsa en uzun bekleyen. Listeden Join her türe girer.
- **Çiftlerde takım (kullanıcı kararı):** Doubles seçiliyken ikinci kalıcı seçici: **Team up** (insanlar aynı takımda, AI'lara karşı) ya da **Face off** (insanlar karşılıklı, her birinin yanında AI partner). Odayı açan seçer; listedeki satır bunu gösterir (`Doubles · Team up 1/2`), PLAY NOW yalnızca aynı tercihteki odalarla eşleştirir. Team up'ta 2 insan dolunca, Face off'ta her takımda bir insan olunca geri sayım başlar; 3. ve 4. insan Face off odasına katılırsa AI partnerlerin yerine geçer (geri sayım bitmeden).
- **Başlama koşulu:** odaya ikinci insan girince 5 sn geri sayım; bitince maç başlar, boş koltuklar AI. Singles 1'e 1, Doubles en az 2 insan + AI.
- **Isınma mimarisi:** ısınma maçı istemcide yerel bir offline maçtır (`startMatch`); sunucu o sırada yalnızca lobiyi tutar, boş odada simülasyon çalıştırmaz (Pi CPU'su). Biri katılınca ısınma sahnesi kapanır, online maç 0-0 başlar.
- **Varsayılanlar:** ilk kez gelen ziyaretçiye 9 oyuncudan rastgele biri, varsayılan raket ve saha. Singles/Doubles ve Team up/Face off seçicileri son seçimi hatırlar (ilk ziyarette Singles). Play vs AI son kayıtlı Friendly seçimlerini kullanır. İsim sorulmaz (bkz. rozet).
- **Davet edilen arkadaş:** kendi kayıtlı seçimleriyle ya da varsayılanla girer; adı yoksa `Player 4821` gibi rastgele bir ad alır (sonra rozetten değiştirir). Oda kapanmışsa: "This game has ended" + PLAY NOW. Lobi zaman aşımı (`lobbyMs`, 15 dk) geçerli; dolunca davet eden "Nobody came — reopen?" görür.
- **Açık liste:** yalnızca açık odalar; satırda oda kodu, takma ad, karakter bayrağı, tür, doluluk. Kodlar zaten rastgele (32 harfli alfabeden 6) ve açık odalar herkese açık olmak için var; özel odalar hiç listelenmez. `list` isteği hız sınırlı. `privacy.html` aynı commit'te "takma adın ve seçtiğin karakter açık listede görünür" der.
- **Güvenlik bulguları ve protokol:** R1–R8'in hiçbiri protokolü kırmaz (kaçışlama, zaman aşımları, sınırlar, kota sayımı, HTTP katmanı). Ayrıntılar gitignore'daki raporda kalır; Opus planı ona göre sıralar.
- **✕ Exit her yerde:** AI/Friendly, online, Training ve kariyer. Kariyer ve turnuva maçında pencere "Leaving counts as a loss" der; Leave mevcut hükmen yenilgi kuralını uygular (0 ödül, pas kalır) ve `#career`'e döner. Training ana sayfaya döner. Diğerleri canlı lobiye.
- **Arşiv ayrıntısı:** seçicilerde arşivlenmişler görünmez. Kayıtlı Friendly seçimi arşivlenmiş bir karakterse 9'dan rastgele birine düşer. Kariyer profili kendi karakterini korur (kariyer ekranlarında görünür). Online rakibin görünüşü zaten `look` ile gelir; bayrak id ile `characters.json`'dan okunur.
- **Yeni 4 karakter:** mevcutların aralığında dengeli statlar, her yerde oynanabilir (kariyer dahil).
- **Katılma hızı:** IP başına katılma hızı R6 düzeltmesindeki sınırla korunur.
- **7/24 kapsamı:** plan DNS/e-posta taşımasını kullanıcının yapacağı elle adımlar listesi olarak içerir; kapı: güvenlik denetçisi temiz rapor verir ve kullanıcı o adımda ayrıca onaylar.

### Antigravity görüşünden alınanlar (agy-26, Opus kodda doğruladı)

- **Arşiv kariyeri bozmasın:** kariyer turnuva kurası (`startTournament`, `src/careerui.js`) 16 çiftlik turnuvada ~30 AI oyuncu ister; havuz 9'a inerse negatif indeksle çöker (doğrulandı). Bu yüzden arşivlenmiş karakterler yalnızca **oyuncunun seçtiği** ekranlardan (Friendly seçici, kariyer karakter yaratma, partner seçici) gizlenir; **AI havuzlarında** (turnuva kurası, sıralama tablosu, rakipler) kalır. Bunun için bir test.
- **Karakter indeksi:** sunucu ve istemci karakteri `characters.json` dizisindeki sırayla eşliyor (`room.chars[seat] = clamp(m.char …)`): arşivlenen karakterler dosyadan silinmez ve sıra değişmez; yeni 4 karakter dizinin sonuna eklenir.
- **Renk:** mevcut limon `--acc: #d8f53a` beyaz üzerinde okunmaz. Açık zeminde vurgu doygun yeşil (örn. `#16A34A`) ve kort mavisi; limon yalnızca koyu zeminli PLAY NOW düğmesinde. `theme-color` da açık renge döner.
- **HD 620:** `index.html` içindeki 13 `backdrop-filter` kaldırılır; opak beyaz kart + ince kenarlık + tek hafif gölge. Animasyonlar yalnızca `transform`/`opacity`.
- **Exit ve skor tablosu:** `#hud` sol üstte; ✕ Exit oraya gelince `#hud` aşağı kayar. `TOP` (`src/touch.js`) içindeki ⏸ kalkar, ✕ Exit `Escape` eylemine bağlanır.
- **Isınmadan online'a geçiş:** `main.js` ilk maçta menüyü kapatıyor ve online başlangıcı `!avatars.length` ile kontrol ediyor; ısınma bunu bozar. Sahneyi `location.reload()` olmadan söküp yeniden kuran bir geçiş gerekir (Opus/Sonnet işi).
- **Duruş:** `thumbs.js` boynu kameraya çeviriyor, `menu.js` önizlemeyi sürekli döndürüyor; karakter verisine duruş alanları (bakış açısı + hareket) eklenir, ikisi bunu kullanır. AR/DE/PT/SE bayrakları `src/flags.js`'te zaten var.
- **İsim penceresi yok:** online bir şeye ilk basışta modal açılmaz; sağ üstte `Player 4821 ✎` rozeti, dokununca yerinde düzenlenir, yanında "visible to other players — don't use your real name". (Önceki "isim bir kez sorulur" kararının yerine.)
- **Açık odada ret yok:** PLAY NOW odasında geri sayım otomatik başlar, ev sahibi reddedemez (yabancıyı sebepsiz geri atmamak için). Ret ve 60 sn engel kuralı kalkar.

## İş bölümü

- **Opus:** güvenlik düzeltmeleri ve sunucu protokolü (açık liste, otomatik başlatma, çıkışta koltuğun AI'a geçmesi), DNS/tünel/Pi adımları, tüm agy işlerinin incelemesi, commit/push. agy raporlarına güvenilmez: her iddia grep ve testle doğrulanır.
- **agy** (`agents/tasks/agy-26…`, Gemini 3.8 Flash, `agy -p "…" --mode plan`): açık tema CSS'i, ana sayfa/lobi görsel düzeni, ✕ Exit düğmesi ve penceresi, duruş/poz ayarı, yeni 4 karakterin görünüşü. Görevler küçük ve tek dosya odaklı verilir.
- **Sonnet 5.5 alt ajanları:** agy kotası biterse ya da bir iş birden fazla modüle dokunuyorsa (ısınma → online geçiş istemci akışı, davet linki akışı).
- **Haiku 5.5:** veri işleri (yeni karakter JSON'ları, 7 dil tablosu çevirileri).

## Kurucuya bırakılanlar

- Sunucu protokolünün mesaj adları ve alanları, otomatik başlatmanın kodda nerede yaşadığı.
- Isınma maçının istemcide nasıl çalıştırılıp online maça devredildiği (yeni sahne mi, aynı sahne mi).
- Liste yenileme yöntemi (sunucu itmesi ya da kısa aralıklı `list`), hız sınırları ve süzgeç ayrıntıları.
- Yeni karakterlerin yüz/saç/ten/kıyafet değerleri (mevcut şemaya uygun, çeşitli).
- Yeni ekranların tam görsel düzeni, animasyonlar ve yazı boyutları — taslak B ve ✕ Exit taslağı yön gösterir (`.superpowers/brainstorm/` altında, gitignore'da).
- Aşama planı ve commit sınırları (`superpowers:writing-plans`).
