# Online sunucu planı (2026-10-20'de başladı)

Kullanıcı acemi, adım adım ilerliyoruz: bir adım bitmeden sonrakine geçme, her adımın sonunda kullanıcıya ne öğrendiğimizi anlat.

## Mevcut durum
`server/server.js` (yaklaşık 165 satır): yetkili (authoritative) oda sunucusu. Simülasyonu sunucu yürütüyor, boş koltukları AI dolduruyor, istemciden gelen her alan temizleniyor (`sanitizeLook`, `clamp`). Tek süreç, odalar bellekte tutuluyor, IP kaydı yok. Pages build'inde `DEFAULT_SERVER = null` (`src/serverurl.js`).

## Adımlar
0. **Ücretsiz deneme (sunucu kiralamadan):** `npm run online` ile bir Cloudflare quick tunnel aç (`cloudflared tunnel --url http://localhost:8080`), ardından arkadaşa `https://padellegends.eu/?server=wss://<tünel>` linkini gönder. Sorulacak sorular: online oyun eğlenceli mi, gecikme vuruş zamanlamasını bozuyor mu?
1. **Herkese açmadan önce sunucuyu sağlamlaştır:**
   - `maxPayload` limiti koy (ws'nin varsayılanı 100 MiB).
   - IP başına bağlantı sınırı, toplam oda sınırı, mesaj hız sınırı.
   - ping/pong ile ölü bağlantıları temizle.
   - Oda kodunu sunucu üretsin (`PADEL1` gibi tahmin edilebilir kodlar olmasın).
   - Maçı yalnız oda kurucusu başlatabilsin.
   - Origin kontrolü ekle.
   - Herkese açık lobide isim filtresi uygula, ya da isimleri hiç göstermeme seçeneğini değerlendir (çocuklar da oynuyor olabilir).
2. **Oyun tasarımı kararı:** Kariyer statları istemcide tutuluyor, yani hile yapmak kolay. Online modda eşit statlar mı olsun, yoksa yalnızca arkadaş maçları mı? Sıralamalı (ranked) maç sunucuda profil tutmayı gerektirir, bu da kişisel veri demek ve sonraya kalıyor.
3. **Barındırma (hosting):** Fly.io (kabaca 2 $/ay, Frankfurt veya Amsterdam bölgesi, TLS otomatik, Linux yönetimi yok) ya da Hetzner (AB şirketi, CX23 kabaca 5,5 €/ay + KDV, VPS'i biz yönetiriz, TLS için Caddy). Fiyatları seçim anında yeniden kontrol et. Alt alan adı: `server.padellegends.eu` (Namecheap'te CNAME veya A kaydı; `_github-pages-challenge` TXT kaydına dokunma). Bu adımda `DEFAULT_SERVER` tek satırla değişir.
4. **Gizlilik sayfasını güncelle:** Sunucu IP adresini (bağlantı süresince) ve seçilen ismi/görünümü görüyor; log tutulmuyor. Fly.io seçilirse barındırma sağlayıcısının adını da yaz.
5. **Sonra:** yeniden bağlanma, Friends Cup (zamanlanmış turnuva), istemci tarafı tahmin (client-side prediction; uzak oyuncular için gecikmeyi azaltır, büyük iş).
