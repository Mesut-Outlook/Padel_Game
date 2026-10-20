# Online sunucu planı (2026-10-20'de başladı)

Kullanıcı acemi, adım adım ilerliyoruz: bir adım bitmeden sonrakine geçme, her adımın sonunda kullanıcıya ne öğrendiğimizi anlat.

## Mevcut durum
`server/server.js` (yaklaşık 165 satır): yetkili (authoritative) oda sunucusu. Simülasyonu sunucu yürütüyor, boş koltukları AI dolduruyor, istemciden gelen her alan temizleniyor (`sanitizeLook`, `clamp`). Tek süreç, odalar bellekte tutuluyor, IP kaydı yok. Pages build'inde `DEFAULT_SERVER = null` (`src/serverurl.js`).

## Adımlar
0. **Ücretsiz deneme (sunucu kiralamadan):** `npm run online` ile bir Cloudflare quick tunnel aç (`cloudflared tunnel --url http://localhost:8080`), ardından arkadaşa `https://padellegends.eu/?server=wss://<tünel>` linkini gönder. Sorulacak sorular: online oyun eğlenceli mi, gecikme vuruş zamanlamasını bozuyor mu?
1. **Herkese açmadan önce sunucuyu sağlamlaştır:** bitti (2026-10-20), testleri `test/server.test.js` içinde.
   - Sınırlar `LIMITS` içinde (`server/server.js`): 100 oda, IP başına 8 bağlantı, bağlantı başına saniyede 120 mesaj, mesaj başına 4096 bayt.
   - Oda kodunu sunucu üretiyor (`join` + `create: true`; 6 karakter, `crypto.randomInt`). Kodla katılmak için oda var olmalı. Maçı yalnızca oda kurucusu başlatıyor (o çıkarsa sıradaki oyuncu). `cfg` izin listesinden geçiyor (`sanitizeCfg`). ping/pong var.
   - Origin: padellegends.eu, localhost ve sayfayı sunan aynı host. Başka site gerekirse `ALLOWED_ORIGINS=a.com,b.com`.
   - Ziyaretçi IP'si: Cloudflare tüneli (cloudflared yerelden bağlanır) için otomatik `cf-connecting-ip`. Fly.io gibi önünde proxy olan bir hostta `TRUST_PROXY=1` ayarla, yoksa herkes aynı IP sayılır ve 8 bağlantı sınırı hepsine birden uygulanır.
   - Açık kalan: herkese açık lobide isim filtresi uygula, ya da isimleri hiç göstermeme seçeneğini değerlendir (çocuklar da oynuyor olabilir).
2. **Oyun tasarımı kararı:** Kariyer statları istemcide tutuluyor, yani hile yapmak kolay. Online modda eşit statlar mı olsun, yoksa yalnızca arkadaş maçları mı? Sıralamalı (ranked) maç sunucuda profil tutmayı gerektirir, bu da kişisel veri demek ve sonraya kalıyor.
3. **Barındırma (hosting):** **Karar (2026-10-20): Hetzner.** Kurulum adımları: `docs/superpowers/plans/2026-10-21-roadmap.md` Faz E. Karşılaştırma: Fly.io (kabaca 2 $/ay, Frankfurt veya Amsterdam bölgesi, TLS otomatik, Linux yönetimi yok) ya da Hetzner (AB şirketi, CX23 kabaca 5,5 €/ay + KDV, VPS'i biz yönetiriz, TLS için Caddy). Fiyatları seçim anında yeniden kontrol et. Alt alan adı: `server.padellegends.eu` (Namecheap'te CNAME veya A kaydı; `_github-pages-challenge` TXT kaydına dokunma). Bu adımda `DEFAULT_SERVER` tek satırla değişir.
4. **Gizlilik sayfasını güncelle:** Sunucu IP adresini, seçilen ismi ve görünümü yalnızca bellekte tutuyor: bağlantı süresince, kopan oyuncu için yeniden katılabilsin diye en fazla yaklaşık 90 sn. Kayıtlara (journald) yalnızca `join/leave/rejoin seat=…` ve dakikalık `status` satırı gidiyor; IP, isim ya da oda kodu yazılmıyor. Hetzner'in adı ve kayıtların saklama süresi (7 gün) de yazılmalı.
5. **Sonra:** ~~yeniden bağlanma~~ (2026-10-21 yapıldı: yeniden katılma anahtarı, koltuk 60 sn ayrılıyor), Friends Cup (zamanlanmış turnuva), istemci tarafı tahmin (client-side prediction; uzak oyuncular için gecikmeyi azaltır, büyük iş).
