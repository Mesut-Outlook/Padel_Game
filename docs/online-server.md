# Online sunucu planı (2026-10-20'de başladı)

Kullanıcı acemi, adım adım ilerliyoruz: bir adım bitmeden sonrakine geçme, her adımın sonunda kullanıcıya ne öğrendiğimizi anlat.

## Mevcut durum
`server/server.js` (yaklaşık 165 satır): yetkili (authoritative) oda sunucusu. Simülasyonu sunucu yürütüyor, boş koltukları AI dolduruyor, istemciden gelen her alan temizleniyor (`sanitizeLook`, `clamp`). Tek süreç, odalar bellekte tutuluyor, IP kaydı yok. Pages build'inde `DEFAULT_SERVER = null` (`src/serverurl.js`).

## Raspberry Pi (2026-11-01)
Kullanıcı aylık ücret ödememek için evdeki Raspberry Pi'yi oyun sunucusu yapmak istiyor. Bu, adım 3'teki Hetzner'in yerine geçen şu anki plan; Hetzner ertelenmiş olarak yedekte kalıyor. Ev ağı adresleri ve kullanıcı adı repoya yazılmaz (repo herkese açık); bunlar yerel Claude hafızasında.

**Cihaz:** Raspberry Pi 3, 1 GB RAM, SD kart. Ayrıntılar yerel Claude hafızasında.

**Yapıldı:** Node 22.23.4 ev klasörüne kuruldu (`~/opt/node`, resmi 32-bit ARM derlemesi yalnızca Node 22'ye kadar var), sunucu kodu `~/padel` altına kopyalandı (`git archive`, commit `25a140c`), `test/server.test.js` Pi'de 23/23 geçti.

**Ölçüm (`~/padel/bench.mjs`, repoda yok):** 4 AI oyunculu oda, 5 simüle dakika, tek çekirdek. Sıcaklık 58 °C, kısma yok.

| AI seviyesi | Ortalama kare | %99 | En kötü kare | %50 çekirdekle oda |
|---|---|---|---|---|
| rookie | 0,22 ms | 1,18 ms | 201 ms | ~37 |
| club | 0,27 ms | 1,26 ms | 420 ms | ~31 |
| pro | 0,22 ms | 1,30 ms | 446 ms | ~37 |
| legend | 0,28 ms | 1,64 ms | 553 ms | ~30 |

Bütçe kare başına 16,67 ms; işlemci payı rahat. Bu sayılar yalnızca simülasyon ve JSON maliyetini gösterir: ağa yazma, tünel ve gerçek oyuncu dahil değil, yani ~30 oda üst sınır, güvenilir kapasite değil. Oda başına çıkış ~70 KB/sn (4 oyuncu, 30 Hz, ~580 bayt). Laptopta aynı ölçüm ~10 kat hızlı.

**Ev ağı testi (2026-11-01):** `dist/` Pi'ye kopyalandı, sunucu elle başlatıldı (`~/padel/server.log`), adres `http://<Pi'nin ev IP'si>:8080`. Oyun Pi'den sunulmak zorunda: `https://padellegends.eu` sayfası şifresiz `ws://` adresine bağlanamaz. Laptoptan iki istemciyle 20 sn maç: 30,9 kare/sn, kareler arası %99 37 ms, en kötü 139 ms, gidiş-dönüş ortalaması 4 ms, en kötü 87 ms. Sunucu servis olmadığı için Pi yeniden başlayınca durur. Aynı gün kullanıcı evde iki gerçek cihazla oynadı ve akıcı buldu; o sırada `status`: 1 oda, 2 oyuncu, `tick_avg` ~0,6 ms, `tick_max` 26 ms, CPU en çok %7,4, 67 MB bellek, kısma yok, hata yok. Bu tek oda ve yaklaşık 3 dakikalık ölçüm; internet üzerinden (tünelle) oynanış henüz denenmedi. Aynı gün sunucu yalnızca Pi'nin içinden erişilecek şekilde değiştirildi (`HOST=127.0.0.1`), yani ev ağından `:8080` adresi artık çalışmıyor; oyun tünelden açılıyor.

**Servis (2026-11-01):** Kod `/opt/padel`, ayrı `padel` kullanıcısı, `padel.service`; tünel ayrı kullanıcıyla `padel-tunnel.service` (quick tunnel, adres her başlatmada değişir, `journalctl -u padel-tunnel` içinde görünür). İkisi de Pi açılınca kendiliğinden başlamaz: `sudo systemctl start padel-tunnel` sunucuyu da başlatır, `sudo systemctl stop padel padel-tunnel` ikisini de kapatır. Laptoptan tünel üzerinden ölçüm: 30,8 kare/sn, gidiş-dönüş ortalaması 36 ms, %95 58 ms, en kötü 210 ms. Kod güncellemesi önce `~/padel`'e, testlerden sonra `/opt/padel`'e kopyalanır.

**Bilinen riskler:**
- En kötü kare 200-550 ms: nedeni ölçülmedi (büyük olasılıkla bellek temizliği ya da JIT). Maç içinde takılma olarak hissedilebilir; gerçek oyuncuyla `status` satırındaki `tickMax` izlenmeli.
- Port yönlendirme yerine tünel kullanılmalı. Tünel ev IP'sini oyunculardan gizler.
- SD kart, elektrik ve ev interneti tek arıza noktası; sunucu kapalıyken online çalışmaz.
- Dışarı açmadan önce yerel güvenlik raporundaki koşullar tamamlanır (repo herkese açık, ayrıntılar buraya yazılmaz).
- Herkese açık kullanımda `privacy.html` güncellenmeli (Cloudflare ziyaretçi IP'sini görür).

**Karar (2026-11-01, kullanıcı kararı Opus'a bıraktı):** Şimdilik quick tunnel ile arkadaş testi: DNS değişmez, adres her açılışta değişir, link `?server=` ile paylaşılır, tünel test bitince kapatılır. Kalıcı `wss://server.padellegends.eu` ertelendi: alan adının DNS'ini Namecheap'ten Cloudflare'a taşımayı gerektirir ve e-posta yönlendirmesini bozabilir. Arkadaş testi online ilgisini göstermeden ya da `contact@` için plan yapılmadan DNS taşınmaz. Taşınırsa MX, SPF, DMARC, CAA ve `_github-pages-challenge` kayıtları eksiksiz taşınmalı; `DEFAULT_SERVER` ancak bundan sonra değişir.

## Adımlar
0. **Ücretsiz deneme (sunucu kiralamadan):** `npm run online` ile bir Cloudflare quick tunnel aç (`cloudflared tunnel --url http://localhost:8080`), ardından arkadaşa `https://padellegends.eu/?server=wss://<tünel>` linkini gönder. Sorulacak sorular: online oyun eğlenceli mi, gecikme vuruş zamanlamasını bozuyor mu?
1. **Herkese açmadan önce sunucuyu sağlamlaştır:** bitti (2026-10-20), testleri `test/server.test.js` içinde.
   - Sınırlar `LIMITS` içinde (`server/server.js`, Pi'ye göre): 10 oda, toplam 40 bağlantı, ziyaretçi başına 8 bağlantı ve aynı anda 3 oda (IPv6 /64 olarak sayılır), bağlantı başına saniyede 120 mesaj, mesaj başına 4096 bayt. Maçı başlatmak için odada en az iki kişi gerekir, başlamayan oda 15 dakikada kapanır. Daha güçlü bir sunucuda bu değerler büyütülür.
   - Oda kodunu sunucu üretiyor (`join` + `create: true`; 6 karakter, `crypto.randomInt`). Kodla katılmak için oda var olmalı. Maçı yalnızca oda kurucusu başlatıyor (o çıkarsa sıradaki oyuncu). `cfg` izin listesinden geçiyor (`sanitizeCfg`). ping/pong var.
   - Origin: padellegends.eu, localhost ve sayfayı sunan aynı host. Başka site gerekirse `ALLOWED_ORIGINS=a.com,b.com`.
   - Ziyaretçi IP'si: Cloudflare tüneli (cloudflared yerelden bağlanır) için otomatik `cf-connecting-ip`. Fly.io gibi önünde proxy olan bir hostta `TRUST_PROXY=1` ayarla, yoksa herkes aynı IP sayılır ve 8 bağlantı sınırı hepsine birden uygulanır.
   - Açık kalan: herkese açık lobide isim filtresi uygula, ya da isimleri hiç göstermeme seçeneğini değerlendir (çocuklar da oynuyor olabilir).
2. **Oyun tasarımı kararı:** Kariyer statları istemcide tutuluyor, yani hile yapmak kolay. Online modda eşit statlar mı olsun, yoksa yalnızca arkadaş maçları mı? Sıralamalı (ranked) maç sunucuda profil tutmayı gerektirir, bu da kişisel veri demek ve sonraya kalıyor.
3. **Barındırma (hosting):** **Ertelendi (2026-11-01):** kullanıcı henüz gelir olmadığı için sunucu kiralamadı (ekranda 7,25 €/ay); şimdilik adım 0'daki ücretsiz tünel kullanılıyor, yeniden bakma ölçütleri `docs/next-steps.md` içinde. **Karar (2026-10-20): Hetzner.** Kurulum adımları: `docs/superpowers/plans/2026-10-21-roadmap.md` Faz E. Karşılaştırma: Fly.io (kabaca 2 $/ay, Frankfurt veya Amsterdam bölgesi, TLS otomatik, Linux yönetimi yok) ya da Hetzner (AB şirketi, CX23 kabaca 5,5 €/ay + KDV, VPS'i biz yönetiriz, TLS için Caddy). Fiyatları seçim anında yeniden kontrol et. Alt alan adı: `server.padellegends.eu` (Namecheap'te CNAME veya A kaydı; `_github-pages-challenge` TXT kaydına dokunma). Bu adımda `DEFAULT_SERVER` tek satırla değişir.
4. **Gizlilik sayfasını güncelle:** Sunucu IP adresini, seçilen ismi ve görünümü yalnızca bellekte tutuyor: bağlantı süresince, kopan oyuncu için yeniden katılabilsin diye en fazla yaklaşık 90 sn. Kayıtlara (journald) yalnızca `join/leave/rejoin seat=…` ve dakikalık `status` satırı gidiyor; IP, isim ya da oda kodu yazılmıyor. Hetzner'in adı ve kayıtların saklama süresi (7 gün) de yazılmalı.
5. **Sonra:** ~~yeniden bağlanma~~ (2026-10-21 yapıldı: yeniden katılma anahtarı, koltuk 60 sn ayrılıyor), Friends Cup (zamanlanmış turnuva), istemci tarafı tahmin (client-side prediction; uzak oyuncular için gecikmeyi azaltır, büyük iş).
