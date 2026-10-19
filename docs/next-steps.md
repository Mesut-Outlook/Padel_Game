# Durum ve sıradaki işler (devir notu, 2026-10-20)

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

## Bekleyenler (kullanıcıdan)
- Yönlendirme testi: Gmail **dışındaki** bir adresten contact@ adresine mail atılacak. Gmail'den Gmail'e yapılan test görünmüyor, bu normal.
- Gmail'den cevap verilirse kişisel adres görünür. İlk cevaptan önce karar verilecek: ayrı bir Gmail hesabı mı, contact@ adına gönderim yapan bir servis mi.
- SSH anahtarına parola: kullanıcı kendisi `ssh-keygen -p -f ~/.ssh/id_ed25519` çalıştıracak. **Dikkat:** parola konduktan sonra ajanların push'u için anahtarın ssh-agent'a ya da KDE Wallet'a yüklü olması gerekir. Push "Permission denied" verirse sebep budur. Kullanıcıya `ssh-add` yapmasını söyle.

## Sıradaki işler (kullanıcının onayladığı sıra)
Ayrıntılar ve satır numaraları yerel güvenlik raporunda (`agents/reports/security-2026-10-20.md`).
1. **Site:** Harici bir oyun sunucusundan (`?server=`) gelen verilerin güvenli işlenmesi.
   - Sunucudan gelen her değer `escapeText`/`escapeHtml` ya da sayıya çevrilerek ekrana konsun.
   - Harici bir sunucuya bağlanmadan önce onay sorulsun ya da izin listesi kullanılsın.
   - `?server=` adresi, `?room=` gibi, GoatCounter yüklenmeden URL'den çıkarılsın.
   - `privacy.html`'ye harici sunucuya giden verilerin tam listesi (IP, isim, görünüm, seviye, statlar) ve kısa bir "Your rights" bölümü eklensin.
   - GoatCounter script'i sürümlü dosya ve SRI ile yüklensin (hash'i GoatCounter belgelerinden doğrula).
2. **DNS (Namecheap → Advanced DNS):** Kullanıcı Chrome'da oturum açıkken ajan yapabilir.
   - TXT `_dmarc` = `v=DMARC1; p=reject; adkim=s; aspf=s`
   - CAA `@` = `0 issue "letsencrypt.org"`
   - MX/SPF ve GitHub TXT kayıtlarına dokunma.
3. **GitHub:** `main` için branch protection (force-push ve silme yasak), Chrome'dan. SSH parolası kullanıcıda (yukarıya bak).
4. **Oyun sunucusunu sağlamlaştırma** (`server/server.js`; her biri için test ekle):
   - Bozuk mesaj ya da bozuk URL ile çökmesin.
   - Bağlantı başına tek oda, toplam oda sınırı, IP başına bağlantı sınırı ve mesaj hız sınırı.
   - `maxPayload`. `cfg` alanları izin listesinden geçsin.
   - Oda kodunu sunucu üretsin; kodlar çakışınca hata versin.
   - Maçı yalnızca oda kurucusu başlatsın. Origin kontrolü, ping/pong, `Object.hasOwn(SHOTS, …)`.
   - `ws` ≥ 8.20.2'ye güncellensin.
5. **Oyunu online'a taşıma** (`docs/online-server.md` adım 0 → 4):
   - Önce Cloudflare tüneliyle arkadaş testi. Sonra stat adaleti kararı (önerim: önce yalnızca arkadaş maçı).
   - Ardından hosting: Fly.io (yaklaşık 2 $/ay, kolay) ya da Hetzner (AB, yaklaşık 5,5 €/ay, yönetimi bizde). Fiyatları seçim anında kontrol et.
   - `server.padellegends.eu` DNS kaydı, `DEFAULT_SERVER` ayarı, gizlilik sayfası güncellemesi.
   - Son olarak `security-auditor` yeniden çalıştırılsın.

Daha sonraya: `vite --host` yalnızca mobil testte kullanılsın, meta CSP, Actions SHA sabitleme ve vite güncellemesi.
