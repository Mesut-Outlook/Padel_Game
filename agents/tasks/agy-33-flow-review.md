# agy-33 — Yeni akışın telefon/tablet/masaüstü incelemesi (salt okunur)

**Veren:** Claude Opus, 2026-11-08. **Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md`, "Başarısızlık sayılacaklar" bölümü. **Kod değiştirme.** Yalnızca rapor yaz.

## Kurulum
- `npx vite build`, sonra `node server/server.js 8080` sayfayı ve sunucuyu birlikte sunar: `http://localhost:8080/`. İkinci bir "oyuncu" için ikinci bir tarayıcı sekmesi aç.
- Ekran boyutları:
  - telefon dikey 390×844,
  - telefon yatay 844×390,
  - tablet 1024×768,
  - masaüstü 1366×768.

## Bak ve ölç
1. **Tek dokunuş:** bekleyen bir maç varken siteyi açan biri ona tek dokunuşla girebiliyor mu? Seçici doğruysa PLAY NOW, ya da listedeki Join.
2. **Davet:** Invite a friend → link → ikinci sekmede link → isim, oyuncu ya da raket ekranı çıkmadan maça giriliyor mu?
3. **Exit:** telefonda ✕ Exit düğmesi aranmadan görülüyor mu? Skor tablosu, dokunmatik düğmeler ve kamera rozetiyle üst üste biniyor mu?
4. **Ana sayfa:** yatay telefonda PLAY NOW kaydırmadan görünüyor mu? Yazılar okunuyor mu (kontrast)? Düğmeler en az 44 px mi?
5. **Kumanda:** ana sayfada D-pad ve A ile her düğmeye ulaşılıyor mu (seçiciler, PLAY NOW, Join, isim rozeti)?
6. **Kartlar:** "left the match", "This game has ended", "Nobody came" kartları telefonda taşıyor mu?
7. **Açık tema:** maç dışı ekranlarda koyu kalmış parça (eski renk) var mı? Maç içinde açık renge dönmüş ve okunmayan parça var mı?

## Kurallar
- Komutlar: `ls`, `cat`, `find`, `grep`, `node`, `npm test`, `npx vite build`, `wc`, `sed`. Dosya düzenleme yok (rapor ve ekran görüntüleri hariç).
- Her bulgu için: ekran boyutu, adımlar, ne gördün, beklenen. Mümkünse dosya:satır öner.

## Rapor
`agents/reports/agy-33-flow-review.md`. Ekran görüntüleri `agents/reports/agy-33/` içine. Görmediğin şeyi "doğrulandı" diye yazma. Bir ekranı açamadıysan açıkça yaz.
