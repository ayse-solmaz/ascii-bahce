# ASCII Bahçe

Yüklediğin fotoğrafı (çiçek, portre, ne istersen) renkli ASCII koduna dönüştüren web sitesi.

**Canlı:** https://ayse-solmaz.github.io/ascii-bahce/

- Tamamen tarayıcıda çalışır — **sunucu yok, fotoğraf hiçbir yere yüklenmez**
- Sürükle-bırak, Ctrl+V ile yapıştırma, dosya seçme
- Orijinal / Yeşil / Amber / Beyaz renk modları, Sobel kenar tespiti (`/ | \ -`)
- "Kodlanarak beliren" animasyon, PNG indirme
- **Kodu al:** resmi terminalde renkli çizen çalıştırılabilir Python kodu ya da siteye gömülebilir HTML kodu

Dosyalar: `index.html`, `style.css`, `app.js` — derleme adımı yok.

## Yerelde çalıştırma

`index.html` dosyasını tarayıcıda aç, ya da:

```bash
python -m http.server 8000
# http://localhost:8000
```

## Canlıya alma

### Seçenek 1 — GitHub Pages

Bu repo GitHub Pages'te `main` dalının kökünden yayınlanır: her `push` sonrası site otomatik güncellenir.
Ayar: repo → **Settings → Pages → Source: Deploy from a branch → main / (root)**.

### Seçenek 2 — Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub reposunu seç.
2. Framework Preset: **Other**, Build Command: boş, Output Directory: `.` (kök).
3. **Deploy**. Her push otomatik yayınlanır. (Hobby planı ücretsiz.)

### Seçenek 3 — Coolify

1. **New Resource → Public/Private Repository** → repoyu seç.
2. Build Pack: **Static** (Nixpacks static da olur), publish dizini: `/`.
3. Deploy.
