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
