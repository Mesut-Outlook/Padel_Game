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
- Seyirciler (agy-23): oyunun kendi karakterlerinden üretilen billboard atlası, koltuklar, saha ve oyuncu ülkelerinin bayrakları.

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
5. **Oyunu online'a taşıma** (`docs/online-server.md` adım 0 → 4):
   - Önce Cloudflare tüneliyle arkadaş testi. **Sürüyor (2026-10-20):** tünelin sunucusu ayrı ve temiz bir kopyadan (`git worktree`, scratchpad) çalışıyor, çünkü agy'nin `npx vite build`'i ana `dist/`'i yarım kodla değiştirdi. Testte bulunan ve düzeltilen hatalar: Copy Link düğmesi oda kutusundan taşıyordu (`cc895c2`); odayı kuran tek başınayken ikinci START maçı yapay zekâyla başlatıyordu, arkadaş "oda dolu" alıyordu (`bb51c34`); başka adımda START'a basınca oda görünmeden kuruluyordu, artık Match adımı açılıyor (`8d0fec2`). Sonra stat adaleti kararı (önerim: önce yalnızca arkadaş maçı).
   - Ardından hosting: Fly.io (yaklaşık 2 $/ay, kolay) ya da Hetzner (AB, yaklaşık 5,5 €/ay, yönetimi bizde). Fiyatları seçim anında kontrol et.
   - `server.padellegends.eu` DNS kaydı, `DEFAULT_SERVER` ayarı, gizlilik sayfası güncellemesi.
   - Son olarak `security-auditor` yeniden çalıştırılsın.

**Güncel plan (2026-10-21):** `docs/superpowers/plans/2026-10-21-roadmap.md`: oyun düzeltmeleri (skor/yardım yeri, son seçimler, servis karşılama kuralı, servis yönü, tekrar akışı), online hazırlığı (yeniden bağlanma, debug paneli, oda kur / maça katıl), asset önbelleği ve Hetzner'e taşıma. Hosting kararı: **Hetzner** (kullanıcı 2026-10-20 onayladı; aynı sunucu ileride başka oyunlara da hizmet edebilir).

Daha sonraya: `vite --host` yalnızca mobil testte kullanılsın, meta CSP, Actions SHA sabitleme ve vite güncellemesi.
