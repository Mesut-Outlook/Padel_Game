# Görev agy-21: Telefon / tablette yatay + Xbox / PS kumandası ile oynama

Sen Antigravity ajanısın; Claude Opus reviewer. Commit ve push yapma — yalnızca Opus commit eder. **agy-20 bittikten sonra başla.**

Kullanıcı talebi (2026-10-19): *"cep telefonu ya da tabletten yatay bir şekilde Xbox ve PS kontrolleri ile oynamak mümkün olacak mı... kontrol et, yapılacakları planla."*

İzinli komutlar: `ls`, `cat`, `find`, `grep`, `head`, `wc`, `sed`, `node`, `npm test`, `npx vite build`, `git diff`, `git status`. Başka komut çalıştırma. Opus aynı anda `src/main.js`'e dokunuyor olabilir (kariyer D: maç sayacı) — düzenlemeden hemen önce dosyayı yeniden oku, başkasının değişikliğini bozma.

## Bugünkü durum (Opus kontrolü)

Çalışan: pad okuma (`src/input.js`, Gamepad API — Android Chrome ve iOS Safari'de Bluetooth Xbox/DualSense/DualShock), menülerde pad gezinme (`src/padnav.js`), PS etiketleri (`src/padstyle.js`), dikeyde "yan çevir" katmanı (`#rotate`, `body.touch`).

Eksik olanlar aşağıda. Dokunmatik cihaz algılaması: `isTouch()` (`src/touch.js`), `body.touch` sınıfı (`src/main.js` ~45). Son kullanılan giriş: `device` (`src/main.js` ~380, `'kb'` / `'pad'`; pad girdisinde `'pad'` olur, ~914).

## İstenen

1. **Pad varken dokunmatik kontroller gizlensin.** Dokunmatik cihazda pad'e basılınca (`device` `'pad'` olunca) `#touchUi` gizlensin ve `body`'ye `pad` sınıfı eklensin; ekrana tekrar dokunulunca (`pointerdown`) dokunmatik kontroller geri gelsin, `pad` sınıfı kalksın. `body.touch` yüzünden gizlenen pad tuş ipuçları (vuruş ipucu satırı, `#cam` rozetindeki tuş, yardım) `body.touch.pad` iken görünsün — CSS'te `body.touch` kurallarını kontrol et.
2. **Yemek önerisi kutusu etiketi** (`src/main.js` `renderOffers`): pad kullanılıyorsa (`device === 'pad'` ya da o oyuncunun pad'i varsa) dokunmatik cihazda da `padText('LT')` yazsın; `tap` yalnızca pad kullanılmıyorken.
3. **Ekran kararmasın (Screen Wake Lock).** Maç sürerken `navigator.wakeLock.request('screen')` iste; maç bitince / menüye dönünce bırak; sekme tekrar görünür olunca (`visibilitychange`) yeniden iste. API yoksa sessizce geç (`try/catch`). Küçük bir saf-olmayan yardımcı yeterli (ör. `src/wakelock.js`: `keepAwake(on)`), `startMatch` / `startOnline` / maç sonu / `toMenu` çağırsın.
4. **Ses yalnızca pad ile açılmıyor.** Mobil tarayıcılar ses bağlamını (`AudioContext`) sadece dokunma/tıklama ile açar; pad tuşu sayılmaz. `src/audio.js` `unlockAudio()` ilk `pointerdown` / `touchend` / `keydown`'da da çağrılsın (tek seferlik, global dinleyici). Maç başladığında ses bağlamı hâlâ `suspended` ise ekranda küçük bir rozet: `🔇 Tap for sound` — dokununca `ctx.resume()` ve rozet kaybolsun.
5. **Uygulama modu (iPhone tam ekran).** `public/manifest.webmanifest`: `name: "Padel Legends"`, `short_name`, `display: "fullscreen"`, `orientation: "landscape"`, `background_color` / `theme_color` (`#0b1520`), `start_url: "/"`, ikonlar (mevcut bir ikon/görsel varsa onu kullan, yoksa 192 ve 512 px PNG ikonu `public/` altına koy — Opus'a raporda belirt). `index.html` `<head>`: `<link rel="manifest">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, `<meta name="theme-color">`, `<link rel="apple-touch-icon">`. Service worker **ekleme** (önbellek sorunları; gerekmiyor).
6. **Ayarlar / yardım metni:** Kontrol yardımında (Xbox yardım katmanı) bir satır: `Phone or tablet: pair an Xbox or PlayStation controller over Bluetooth, then press any button.` — mevcut yardım metninin olduğu yere, İngilizce.

## Test, build, rapor

- Saf mantık varsa (ör. hangi etiketin yazılacağı) küçük bir test ekle; `npm test` ve `npx vite build` geçmeli, son satırları rapora koy.
- `?touch` ile masaüstünde dene: dokunmatik kontroller görünür; pad'e basınca kaybolmalı (pad yoksa bu adımı raporda "denenemedi" diye yaz).
- Rapor: `agents/reports/agy-21-mobile-gamepad.md` — değişen dosyalar/fonksiyonlar, her maddenin nasıl denendiği. Kodda olmayan bir isim yazma; Opus her ismi grep ile kontrol eder.
- Gerçek cihaz testi kullanıcıda: Android Chrome + iPhone Safari, Xbox ve PS kumandası.
