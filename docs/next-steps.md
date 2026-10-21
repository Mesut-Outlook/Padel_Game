# Durum ve sıradaki işler (devir notu, son güncelleme 2026-10-21)

Bu not, 2026-10-19/20 tarihlerinde ev dizininden açılan bir Claude Code oturumunda yapılanları ve alınan kararları özetler. Kullanıcı bundan sonra **Antigravity IDE içinden** devam ediyor. Yeni oturum önce bunu, `CLAUDE.md`'yi ve `docs/online-server.md`'yi okusun.

## Kullanıcı hakkında
- Yazılım ve oyun sunucusu konusunda **acemi**. Türkçe konuşuyor. "Yavaş yavaş gidelim" diyor: her adımda ne yapıldığını ve nedenini sade bir dille anlat. Kıdemli yazılımcı ve oyun tasarımcısı gibi yol göster.
- "Başımın hiçbir şekilde ağrımasını istemiyorum": gizlilik ve güvenlik konusunda temkinli ol, riskli bir şeyi önce sor.
- Hafızada yanlış olabilecek şeyleri kontrol etmeden "hatırlıyorum" deme. Repo ve git geçmişi asıl kaynak.

## Alınan kararlar
- **Kişisel veri toplanmayacak.** Çerez yok, hesap yok, Google Analytics yok (değerlendirildi, reddedildi). Ziyaretçi IP'sini üçüncü tarafa sızdıran kaynak yok. Sayaç olarak GoatCounter kalıyor (yalnızca sabit olay adları).
- **Henüz ticari değil.** Reklam, satın alma ya da bağış gelirse önce kullanıcıya Impressum ve gizlilik sayfasının gözden geçirilmesi gerektiğini söyle.
- **İletişim:** `contact@padellegends.eu` adresi Namecheap Email Forwarding ile kullanıcının Gmail'ine yönlendiriliyor (yalnızca gelen posta). Gmail adresi hiçbir yerde yayınlanmaz.
- **Git:** `origin` SSH ile bağlı. Yalnızca Opus push eder, `npm test` geçtikten sonra. Push'tan sonra Pages yayınının başarılı olduğu kontrol edilir.
- **Güvenlik raporları** `agents/reports/security-*.md` içinde ve **gitignore'da** (repo herkese açık). Açıkların ayrıntısı commit'e, dokümana ya da issue'ya yazılmaz.
- **Online:** Önce arkadaşlar arası (oda kodu ya da davet linki). Sıralamalı maç ve sunucuda profil tutmak sonraya kalıyor, çünkü kişisel veri demek.

## Yapılanlar (hepsi canlıda, https://padellegends.eu)
- Google Fonts kaldırıldı. Barlow Condensed artık `public/fonts/` içinden geliyor (lisans OFL, `@font-face` `index.html` içinde).
- `privacy.html` eklendi (Vite girişi). HOME alt çubuğunda **Privacy** ve **✉ contact@padellegends.eu** linkleri var.
- Namecheap: `contact@` yönlendirmesi kuruldu (MX eforward1-5 + SPF). `_github-pages-challenge-mesut-outlook` TXT kaydı korunuyor.
- Git `origin` HTTPS'ten SSH'ye çevrildi.
- `.claude/agents/security-auditor.md` (salt okunur denetçi) oluşturuldu ve ilk denetim yapıldı: `agents/reports/security-2026-10-20.md` (yerel dosya, git'te yok).
- `CLAUDE.md`'ye gizlilik, push ve denetim kuralları eklendi.
- Seyirciler (agy-23): oyunun kendi karakterlerinden üretilen billboard atlası, koltuklar, saha ve oyuncu ülkelerinin bayrakları.
- Seyirciler sahaya dönük oturuyor (agy, `7444de7`).
- **2026-10-21** (plan: `docs/superpowers/plans/2026-10-21-roadmap.md`, hepsi canlıda):
  - Servisi yalnızca karşılayan oyuncu döndürür (FIP); partner ve AI partneri vuramaz (`receiverId` in `rules.js`).
  - Servis yönü dünya x'i (eskiden bir kutuda ters); T'den yan duvara kadar; atış (toss) boyunca yön verilebilir; insan servis atarken karşı kutuda yeşil halka hedefi gösterir (`serveX` in `game.js`).
  - Tekrar: karar `game.js`'te (`REPLAY`, uzun ralli / smash / camdan dönen topa vuruş), son 2 vuruş; sunucuda `holdReplay` ile sonraki servis tekrar bitene kadar bekler; yalnızca sayıyı kazanan takım `skip` ile atlar; R yalnızca sayılar arasında.
  - Yeniden bağlanma: koltuk başına rastgele anahtar, kopan koltuk 60 sn AI ile ayrılır, istemci ~30 sn dener (`net.js` `RETRY`); kimse bağlı değilse maç durur; join/leave/rejoin kaydı (IP, isim, oda kodu yok).
  - `?debug` paneli (`src/debug.js`), sunucuda dakikalık `status` satırı ve `ping`/`pong`.
  - Service Worker önbelleği (`public/sw.js`): modeller tek kalıcı önbellekte, arka planda ETag ile kontrol; yayında yalnızca eski hash'li JS silinir; `?nosw` kaldırır.
  - Skor tablosu sol üst, yardım sağ üst (`padel.helpPos.v2`), kamera rozeti sağ alt; Friendly seçimleri hatırlanır (`padel.friendly.v1`, agy-24).
  - Online akış: isim alanı, "Bir oda kur" / "Arkadaşının odasına katıl" kartları, lobide takım takım oyuncu listesi (`src/lobbyview.js`, kariyer de kullanır), duruma göre alt düğme (ODA KUR / ODAYA KATIL / MAÇI BAŞLAT / KURUCU BEKLENİYOR), Odadan çık, davet linki Maç adımını açar ve `?server=` taşır, sunucu hataları çevrilir. İki sekmeyle yerel sunucuda uçtan uca denendi.
  - Güvenlik denetimi (`agents/reports/security-2026-10-21-rejoin.md`, yerel) bulguları kapatıldı (`7a76dab`).

## Bekleyenler (kullanıcıdan)
- Yönlendirme testi: Gmail **dışındaki** bir adresten contact@ adresine mail atılacak. Gmail'den Gmail'e yapılan test görünmüyor, bu normal.
- Gmail'den cevap verilirse kişisel adres görünür. İlk cevaptan önce karar verilecek: ayrı bir Gmail hesabı mı, contact@ adına gönderim yapan bir servis mi.
- SSH anahtarına parola: kullanıcı kendisi `ssh-keygen -p -f ~/.ssh/id_ed25519` çalıştıracak. **Dikkat:** parola konduktan sonra ajanların push'u için anahtarın ssh-agent'a ya da KDE Wallet'a yüklü olması gerekir. Push "Permission denied" verirse sebep budur. Kullanıcıya `ssh-add` yapmasını söyle.

## Sıradaki işler (kullanıcının onayladığı sıra)
Ayrıntılar ve satır numaraları yerel güvenlik raporunda (`agents/reports/security-2026-10-20.md`).
1. ~~**Site:** `?server=` ile gelen veriler~~ **Bitti (2026-10-20):** yabancı sunucuya bağlanmadan önce onay (`allowServer` in `serverurl.js`), `?server=` URL'den çıkarılıyor, GoatCounter `count.v5.js` + SRI, `privacy.html` (online verileri + Your rights).
2. ~~**DNS**~~ **Bitti (2026-10-20):** Namecheap'e TXT `_dmarc` = `v=DMARC1; p=reject; adkim=s; aspf=s` ve CAA `@` = `0 issue "letsencrypt.org"` eklendi. MX/SPF ve GitHub TXT kayıtlarına dokunulmadı. İleride oyun sunucusu Let's Encrypt dışında bir sertifika kullanırsa CAA'ya o da eklenmeli.
3. ~~**GitHub**~~ **Bitti (2026-10-20):** ruleset "protect main" (aktif, varsayılan dal): silme ve force-push yasak; PR ya da status check zorunluluğu yok, normal push ve Pages yayını çalışıyor. Oluştururken GitHub "Confirm access" istiyor, onayı kullanıcı verir.
4. ~~**Oyun sunucusunu sağlamlaştırma**~~ **Bitti (2026-10-20):** ayrıntılar `docs/online-server.md` adım 1'de. `ws` 8.22.0. Hosting seçilince `TRUST_PROXY` notunu unutma.
5. **Oyunu online'a taşıma:** Cloudflare tüneliyle arkadaş testi yapıldı (2026-10-20), bulunan hatalar düzeltildi. Hosting kararı **Hetzner**. Kurulum: roadmap Faz E.

## Yarın (kullanıcı 2026-10-21'de Hetzner'i yapacak)
Kullanıcı acemi: her adımı sade anlat, şifre ve ödeme bilgisini **kullanıcı** girer, ajan girmez. Sırayla:
1. **Kullanıcı:** hetzner.com → Cloud → hesap aç (e-posta + şifre), e-postayı onayla, ödeme yöntemi ekle (kimlik doğrulaması isteyebilir). **İki adımlı doğrulamayı aç.**
2. **Kullanıcı:** Cloud Console → yeni proje `padel`.
3. **Kullanıcı:** Security → SSH keys → Add: terminalde `cat ~/.ssh/id_ed25519.pub` çıktısını yapıştır (açık anahtar, paylaşmak güvenli; özel anahtar `id_ed25519` asla paylaşılmaz). Anahtara parola kondu ise önce `ssh-add`.
4. **Kullanıcı:** Firewalls → yeni kural seti: gelen TCP 22, 80, 443 (+ ICMP).
5. **Kullanıcı:** sunucu oluştur: konum Nürnberg ya da Falkenstein, Ubuntu 24.04, CX23 (fiyatı o gün kontrol et), IPv4 + IPv6, SSH anahtarı ve firewall seçili, isim `padel-1`. IPv4 ve IPv6 adreslerini Claude'a ver.
6. **Kullanıcı (Namecheap → Advanced DNS):** `A` kaydı `server` → IPv4, `AAAA` kaydı `server` → IPv6. Diğer kayıtlara (MX, SPF, DMARC, CAA, GitHub TXT) dokunma.
7. **Opus (SSH, anahtarla):** roadmap Faz E adım 2–7: güncellemeler + `unattended-upgrades`, root/parola girişi kapalı, Node 22, `padel` kullanıcısıyla systemd servisi (`HOST=127.0.0.1`, `TRUST_PROXY=1`), journald 7 gün, Caddy (Let's Encrypt, CAA'ya uygun) `server.padellegends.eu` → `127.0.0.1:8080`, IP başına yeni bağlantı hızı sınırı, `DEFAULT_SERVER = 'wss://server.padellegends.eu'`, `privacy.html` (Hetzner, saklama süresi; "henüz sunucu yok" cümlesi kalkar), `security-auditor`, sonra gerçek sunucuda arkadaş testi.
8. ~~**Antigravity (agy-25)**~~ **Bitti (2026-10-21):** Seyircilerin sahaya bakacak şekilde yönlendirilmesi (kullanıcının ekran görüntüsü). `src/court.js` içindeki `crowdMesh` billboard quadvaryasyonlarının `q.identity()` yerine tribünün bulunduğu tarafa (`-side * Math.PI / 2`) göre sahaya ve kort içine bakması sağlanacak. Görev dosyası: `agents/tasks/agy-25-crowd-facing.md`.

## Açık konular (sonraya)
- Stat adaleti (online'da kariyer statları) ve açık lobi isim filtresi: kullanıcı kararı.
- Seyirci atlası HD 620'de ~5 sn (o sırada eski seyirci görünüyor); kareler arasına yaymak düşünülebilir. Saha küçük resimlerinde tribün basamakları artık görünmüyor.
- vite/esbuild dev bağımlılığı uyarıları; meta CSP; Actions SHA sabitleme.
- Makinede bilinmeyen açık port 7070 (kullanıcıya soruldu); diğer oturumun `vite --host` sunucusu (5173) evdeki ağa açık.
- Otomatik tekrar tarayıcıda gözle izlenemedi (bu makinede arka plan sekmesi ~1 FPS); birim testleri var, kullanıcı oynarken kontrol etsin.
- Yapay zekâ maçlarında servis atanın sayı oranı %56 → %51 (yeni servis hedefleri); oynanışta servis zayıf gelirse ayarla.
- Kullanılmayan eski online locale anahtarları ("USE CODE", "OR JOIN / ENTER CODE" vb.) temizlenebilir.
- Telefon dokunmatik kontrol seçeneği ve kariyer para birimlerinin hep görünmesi: eski açık sorular.

Daha sonraya: `vite --host` yalnızca mobil testte kullanılsın, meta CSP, Actions SHA sabitleme ve vite güncellemesi.
