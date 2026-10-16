# Görev agy-04: Görsel giriş ekranı (tasarım: Opus · uygulama + görsel üretim: Antigravity)

Sen Antigravity ajanısın; Opus reviewer. Tasarım aşağıda **kesin**; uygulamayı ve görselleri sen üret. Yeni npm bağımlılığı ekleme. Önce `CLAUDE.md` ve `AGENTS.md` oku. Repo başka ajanlarca da düzenleniyor: her düzenlemeden önce dosyayı yeniden oku.

## Amaç
Şu anki giriş ekranı düz `<select>` listeleri. Yerine **görsellerden seçilen**, yayın kalitesinde bir menü: karakterler portreleriyle, mekanlar küçük resimleriyle, raketler kendi görüntüleriyle seçilir. Kalan ayarlar görsel kart ya da segmentli liste.

## Görsel yön — "gece seansı yayın grafiği"
- Renkler: zemin `#0b1520`, panel `rgba(10,18,28,.78)` + `backdrop-filter: blur(10px)`, kort mavisi `#2f6fb5`, vurgu (top sarısı) `#d8f53a`, ikincil metin `#9fb3c8`.
- Arka planda kortun üstten çizgileri (servis çizgileri, orta çizgi, file) çok soluk ince beyaz SVG çizgileri olarak.
- Başlıklar: `'Barlow Condensed', 'Oswald', system-ui` kalın, büyük harf (Google Fonts linki `display=swap`; çevrimdışı da düzgün görünmeli). Sayılar `font-variant-numeric: tabular-nums`.
- Kartlar: 12 px köşe, 1 px `#ffffff1a` kenar. Hover'da hafif yükselme. Seçili kart: 2 px sarı çerçeve + sağ üstte ✓ rozeti. Klavye/kol odağı: sarı dış halka (`:focus-visible`).
- Kısa, zevkli animasyonlar (150–250 ms). `prefers-reduced-motion` varsa kapat.

## Yerleşim (öncelik 1366×768 dizüstü; 1024×640'ta da sığsın; < 700 px genişlikte tek sütun)
- **Üst şerit:** solda logo `PADEL` (beyaz) + `LEGENDS` (sarı), altında küçük `MESUT PADEL TOUR`. Sağda `Geliştirici: Mesut`.
- **Sol sütun (~38%) — canlı oyuncu önizlemesi:** seçili karakterin oyundaki gerçek 3D modeli (`createAvatar`), idle animasyonda, yavaşça dönen, mavi bir kort diski üzerinde, **seçili raket elinde**. Altında: ad, ülke bayrağı (countryCode → emoji), Kadın/Erkek, Sağlak/Solak, stat çubukları (Hız, Güç, Kontrol, Vole, Smaç; 0–10).
  - Tek bir küçük WebGL renderer, `pixelRatio ≤ 1.25`, menü gizlenince render durur ve dispose edilir (Intel HD 620 hedefi).
- **Sağ sütun (~62%) — adımlar:** üstte sekmeler `1 Mod · 2 Oyuncu · 3 Mekan · 4 Raket · 5 Maç`. Sekmeler her an tıklanabilir. Panelin altında "İleri →".
  1. **Mod:** iki büyük kart, **Çiftler 2v2** ve **Tekler 1v1**. Her kartta kortun üstten SVG çizimi, 4 ya da 2 oyuncu noktası.
     - **İnsan oyuncu:** segmentli `0 (İzle) / 1 / 2 / 3 / 4`. Teklerde 3 ve 4 pasif.
     - **Kontrol:** üç kart, *Klavye + Xbox kolu*, *Sadece klavye*, *Sadece Xbox kolu*. SVG klavye/kol ikonları, altında canlı "🎮 1 kol bağlı" yazısı (`navigator.getGamepads`).
  2. **Oyuncu:** karakter kartı ızgarası (4 sütun). Her kartta portre görseli (gerçek modelden baş-omuz render'ı, 256×256, karakterin forma renginde gradyan zemin), ad, bayrak, K/E rozeti.
     - Üstte filtre çipleri: Tümü / Kadın / Erkek.
     - Hover ya da odakta soldaki önizleme o karaktere geçer, seçimde sabitlenir.
  3. **Mekan:** mekan kartları (3 sütun). Her kartta o mekânın gerçek render'ı (`buildVenue` ile kuşbakışı 3/4 açı, 400×225), ad, şehir ve bayrak.
     - Çipler: İç / Dış / Plaj / Çatı · Gündüz / Gün batımı / Gece · zemin renk noktası.
  4. **Raket:** kart başına raket render'ı (önden, kendi rengi ve **şekli**), ad, şekil etiketi (Yuvarlak / Gözyaşı / Elmas), ağırlık.
     - Güç / Kontrol / Spin / Tatlı nokta çubukları.
     - Seçim önizlemedeki raketi değiştirir.
  5. **Maç:** hepsi segmentli kontrol.
     - **Set:** 1 set / 3 set / 2 set + süper tie-break
     - **Deuce:** Altın sayı / Avantaj / Star Point
     - **AI:** Çaylak ★ / Kulüp ★★ / Profesyonel ★★★ / Efsane ★★★★
     - **Oyun hızı:** Yavaş / Normal / Hızlı
- **Sağ alt, sabit:** özet satırı ("Çiftler · Lucia Varela · Madrid Indoor Arena · Starter Nova · 3 set") + büyük sarı **MAÇA BAŞLA**.
- **"Arkadaşlarla online" katlanır paneli:** oda kodu, "Odaya katıl / kur" ve lobi yazısı.

## Kol / klavye ile gezinme (zorunlu — kullanıcı Xbox koluyla oynuyor)
- **Klavye:**
  - Tab / ok tuşları kartlar arasında gezer.
  - Enter ya da Space seçer.
- **Xbox kolu:** menü görünürken `requestAnimationFrame` ile oku, gizlenince dur.
  - D-pad ya da sol çubuk odağı ızgarada 2B taşır.
  - **A** seçer.
  - **B** önceki sekmeye döner.
  - **LB / RB** sekme değiştirir.
  - **Start** maçı başlatır.

## Görsel üretim kuralları
- Portre, mekan ve raket görselleri **oyunun kendi CC0 3D modellerinden** çalışma anında render edilir (`src/thumbs.js`).
  - Tek offscreen renderer, sırayla ve `requestIdleCallback` ile.
  - Sonuç `dataURL` olarak bellekte cache'lenir.
  - Görsel hazır olana kadar kartta şık bir iskelet (shimmer) gösterilir.
- Elinde görsel üretme aracı varsa en fazla **bir** dekoratif arka plan üretebilirsin: `public/assets/menu/bg.jpg`, ≤1024 px, ≤200 KB, gece ışığında soyut padel kortu; logo, yazı ya da gerçek kişi olmasın. Yoksa CSS/SVG kullan.
- Ticari oyunlardan ya da internetten görsel kopyalama yok.

## Entegrasyon sözleşmesi
- Mevcut form kontrolleri **tek gerçek kaynak** olarak kalsın (gizlenebilirler):
  - `#mode #humans #char #ai #venue #racket #sets #golden #speed #control #room #start #online #lobby`
  - Kartlar bunların `.value` değerini yazıp `change` olayı tetikler.
  - `main.js`'in okuma mantığı ve `fill()` aynen çalışmaya devam etmeli.
- **Yeni dosyalar:**
  - `src/menu.js`: DOM + kol gezinmesi, `main.js`'ten bir kez import edilir.
  - `src/thumbs.js`: offscreen render.
- **Raket şekli:** `src/player.js` içinde `makeRacket(color, shape)` `'round' | 'teardrop' | 'diamond'` desteklesin.
  - Varsayılan `round`, raket boyu aynı kalsın.
  - `createAvatar(scene, ch, racketColor, racketShape)` imzasıyla geçir.
  - `main.js`'teki çağrıya `rk[id].shape` ekle.
  - Böylece maçta da doğru şekil görünür.
- **Dokunma:** `src/game.js`, `physics.js`, `rules.js`, `ai.js`, `audio.js`, `server/`, `test/` (test eklemek serbest).
- Metinler Türkçe.

## Doğrulama
1. `npm test` yeşil, `npx vite build` hatasız.
2. Dev sunucusu zaten açık: http://localhost:5173. Konsolda hata olmamalı.
3. Yeni menüden çiftler/tekler, 0 ve 1 insanla maç başlıyor. Seçilen karakter, mekan ve raket maçta görünüyor.
4. Menü açıkken FPS düşmüyor, menü kapanınca önizleme renderer'ı dispose ediliyor.

## Rapor
`agents/reports/agy-04-menu.md`. İçerik:
- Değişen ve eklenen dosyalar.
- Tasarımdan sapmalar ve nedenleri.
- Bilinen sorunlar.
- Ekran görüntüsü aldıysan yolu.
