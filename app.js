// ascii_bahce — fotoğrafı renkli ASCII koduna dönüştürür. Tamamen istemci tarafında çalışır.
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const FONT = '"JetBrains Mono", ui-monospace, Consolas, monospace';

  // Karakter setleri: koyudan açığa
  const RAMPS = {
    klasik: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    basit: " .:-=+*#%@",
    harf: " .,:;ilrtfjxnuvczXYUJCLQ0OZmwqpdbkhaoMW8B",
    blok: " ░▒▓█",
    binary: " 01",
  };

  const ids = ["cols", "ramp", "custom", "mode", "sat", "boost", "contrast", "cut", "edges", "font", "invert", "bg"];
  const el = Object.fromEntries(ids.map((id) => [id, $("#" + id)]));

  const out = $("#out");
  const ctx = out.getContext("2d");
  const work = document.createElement("canvas");
  const wctx = work.getContext("2d", { willReadFrequently: true });

  let source = null; // Image veya canvas
  let result = null; // son dönüşüm
  let animId = 0;

  // ---------- Dönüştürme ----------
  function getRamp() {
    if (el.ramp.value === "ozel") return el.custom.value.length >= 2 ? el.custom.value : RAMPS.basit;
    return RAMPS[el.ramp.value];
  }

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  function convert() {
    const cols = +el.cols.value;
    const fs = +el.font.value;
    const sat = +el.sat.value, boost = +el.boost.value, contrast = +el.contrast.value;
    const cut = +el.cut.value, edges = +el.edges.value, invert = el.invert.checked;
    const mode = el.mode.value;
    const ramp = [...getRamp()];
    const rn = ramp.length;

    ctx.font = `${fs}px ${FONT}`;
    const cw = ctx.measureText("M").width;
    const ch = Math.ceil(fs * 1.12);

    const iw = source.naturalWidth || source.width;
    const ih = source.naturalHeight || source.height;
    const rows = Math.max(1, Math.round((cols * ih / iw) * (cw / ch)));

    // Görüntüyü hücre boyutuna küçült (her piksel = bir karakter)
    work.width = cols;
    work.height = rows;
    wctx.imageSmoothingEnabled = true;
    wctx.imageSmoothingQuality = "high";
    wctx.clearRect(0, 0, cols, rows);
    wctx.drawImage(source, 0, 0, cols, rows);
    const d = wctx.getImageData(0, 0, cols, rows).data;

    const n = cols * rows;
    const lum = new Float32Array(n);
    const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const a = d[i * 4 + 3] / 255; // şeffaf PNG -> siyah
      let r = clamp01(((d[i * 4] / 255) * a - 0.5) * contrast + 0.5);
      let g = clamp01(((d[i * 4 + 1] / 255) * a - 0.5) * contrast + 0.5);
      let b = clamp01(((d[i * 4 + 2] / 255) * a - 0.5) * contrast + 0.5);
      const L = 0.299 * r + 0.587 * g + 0.114 * b;
      lum[i] = L;
      R[i] = clamp01(L + (r - L) * sat);
      G[i] = clamp01(L + (g - L) * sat);
      B[i] = clamp01(L + (b - L) * sat);
    }

    const glyph = new Array(n);
    const color = new Array(n);

    for (let i = 0; i < n; i++) {
      const L = invert ? 1 - lum[i] : lum[i];
      if (L < cut) { glyph[i] = " "; continue; }
      const idx = Math.min(rn - 1, Math.max(0, Math.round(L * (rn - 1))));
      glyph[i] = ramp[idx];
    }

    // Sobel kenar tespiti: güçlü kenarlarda yönlü karakterler
    if (edges > 0) {
      const thr = 0.62 - edges * 0.54;
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          if (glyph[i] === " ") continue;
          const tl = lum[i - cols - 1], t = lum[i - cols], tr = lum[i - cols + 1];
          const l = lum[i - 1], r = lum[i + 1];
          const bl = lum[i + cols - 1], b = lum[i + cols], br = lum[i + cols + 1];
          const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
          const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
          const mag = Math.hypot(gx, gy) / 4;
          if (mag > thr) {
            let ang = (Math.atan2(gy, gx) * 180) / Math.PI;
            if (ang < 0) ang += 180;
            glyph[i] = ang < 22.5 || ang >= 157.5 ? "|" : ang < 67.5 ? "/" : ang < 112.5 ? "-" : "\\";
          }
        }
      }
    }

    // Renkler (yakın renkler gruplanır -> daha hızlı çizim)
    const q = (v) => Math.min(255, Math.round((v * 255) / 6) * 6);
    const rgb = new Uint8Array(n * 3);
    for (let i = 0; i < n; i++) {
      if (glyph[i] === " ") continue;
      const L = clamp01(lum[i] * boost);
      let r, g, b;
      switch (mode) {
        case "matrix": r = L * 0.25; g = L; b = L * 0.4; break;
        case "amber": r = L; g = L * 0.69; b = L * 0.1; break;
        case "gri": r = g = b = L; break;
        case "beyaz": r = g = b = 0.92; break;
        default: r = R[i] * boost; g = G[i] * boost; b = B[i] * boost;
      }
      rgb[i * 3] = q(r); rgb[i * 3 + 1] = q(g); rgb[i * 3 + 2] = q(b);
      color[i] = `rgb(${rgb[i * 3]},${rgb[i * 3 + 1]},${rgb[i * 3 + 2]})`;
    }

    return { cols, rows, cw, ch, fs, glyph, color, rgb, ramp };
  }

  // ---------- Çizim ----------
  function setupCanvas(res) {
    out.width = Math.ceil(res.cols * res.cw);
    out.height = res.rows * res.ch;
    ctx.font = `${res.fs}px ${FONT}`;
    ctx.textBaseline = "top";
  }

  function draw(res) {
    setupCanvas(res);
    ctx.fillStyle = el.bg.value;
    ctx.fillRect(0, 0, out.width, out.height);
    let cur = "";
    const { cols, rows, cw, ch, glyph, color } = res;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const g = glyph[i];
        if (g === " ") continue;
        if (color[i] !== cur) ctx.fillStyle = cur = color[i];
        ctx.fillText(g, x * cw, y * ch);
      }
    }
  }

  // Videodaki gibi "kodlanarak beliren" animasyon
  function animate(res) {
    cancelAnimationFrame(animId);
    setupCanvas(res);
    const { cols, rows, cw, ch, glyph, color, ramp } = res;
    const n = cols * rows;
    const reveal = new Float32Array(n);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        reveal[y * cols + x] = (y / rows) * 0.65 + Math.random() * 0.3;
      }
    }
    const duration = 2200;
    const start = performance.now();
    const pick = () => ramp[1 + ((Math.random() * (ramp.length - 1)) | 0)] || "#";

    const frame = (now) => {
      const p = (now - start) / duration;
      ctx.fillStyle = el.bg.value;
      ctx.fillRect(0, 0, out.width, out.height);
      let cur = "";
      for (let i = 0; i < n; i++) {
        if (glyph[i] === " ") continue;
        const t = reveal[i];
        if (p < t - 0.12) continue; // henüz görünmüyor
        const x = (i % cols) * cw, y = ((i / cols) | 0) * ch;
        if (p < t) { // karışık karakter fazı
          if (cur !== "#3a7") ctx.fillStyle = cur = "#3a7";
          ctx.fillText(pick(), x, y);
        } else {
          if (color[i] !== cur) ctx.fillStyle = cur = color[i];
          ctx.fillText(glyph[i], x, y);
        }
      }
      if (p < 1) animId = requestAnimationFrame(frame);
      else draw(res);
    };
    animId = requestAnimationFrame(frame);
  }

  // ---------- Güncelleme döngüsü ----------
  let pending = false;
  function update() {
    if (pending || !source) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      cancelAnimationFrame(animId);
      result = convert();
      draw(result);
      scheduleCode();
    });
  }

  function syncOutputs() {
    for (const id of ["cols", "sat", "boost", "contrast", "cut", "edges", "font"]) {
      const o = $("#" + id + "V");
      if (o) o.textContent = el[id].value;
    }
    el.custom.hidden = el.ramp.value !== "ozel";
  }

  for (const id of ids) {
    el[id].addEventListener("input", () => { syncOutputs(); update(); });
    el[id].addEventListener("change", () => { syncOutputs(); update(); });
  }

  // Segmentli seçiciler (gizli input'a değer yazar)
  document.querySelectorAll(".seg").forEach((seg) => {
    const target = el[seg.dataset.for];
    seg.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
      target.value = btn.dataset.value;
      update();
    });
  });

  // ---------- Görsel yükleme ----------
  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) { toast("Lütfen bir görsel dosyası seç"); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      source = img;
      update();
      setTimeout(() => result && animate(result), 30);
    };
    img.onerror = () => toast("Bu görsel açılamadı (HEIC ise JPG/PNG'ye çevir)");
    img.src = url;
  }

  $("#file").addEventListener("change", (e) => loadFile(e.target.files[0]));

  const drop = $("#drop");
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => loadFile(e.dataTransfer.files[0]));
  window.addEventListener("paste", (e) => {
    const item = [...(e.clipboardData?.items || [])].find((it) => it.type.startsWith("image/"));
    if (item) loadFile(item.getAsFile());
  });

  // ---------- Kod üretimi ----------
  // Renk anahtarları: " ve \ hariç yazdırılabilir karakterler (Python string'inde kaçış gerektirmez)
  let KEYS = "";
  for (let c = 35; c < 127; c++) if (c !== 92) KEYS += String.fromCharCode(c);

  // Renkleri küçük bir paletle sınırla -> kod kısa kalır
  function buildPalette(res) {
    const { glyph, rgb } = res;
    for (const step of [16, 24, 32, 40, 48, 64, 85]) {
      const map = new Map();
      const idx = new Int16Array(glyph.length).fill(-1);
      let ok = true;
      for (let i = 0; i < glyph.length && ok; i++) {
        if (glyph[i] === " ") continue;
        const qv = (v) => Math.min(255, Math.round(v / step) * step);
        const key = (qv(rgb[i * 3]) << 16) | (qv(rgb[i * 3 + 1]) << 8) | qv(rgb[i * 3 + 2]);
        if (!map.has(key)) {
          if (map.size >= KEYS.length) { ok = false; break; }
          map.set(key, map.size);
        }
        idx[i] = map.get(key);
      }
      if (ok) return { pal: [...map.keys()], idx };
    }
  }

  // Her satırı sondaki boşluklardan arındırıp [karakterler, renk anahtarları] olarak döndür
  function rowsOf(res, idx) {
    const { cols, rows, glyph } = res;
    const out = [];
    for (let y = 0; y < rows; y++) {
      let end = cols;
      while (end > 0 && glyph[y * cols + end - 1] === " ") end--;
      let chars = "", keys = "";
      for (let x = 0; x < end; x++) {
        const i = y * cols + x;
        chars += glyph[i];
        keys += idx[i] < 0 ? " " : KEYS[idx[i]];
      }
      out.push([chars, keys]);
    }
    while (out.length && out[out.length - 1][0] === "") out.pop();
    while (out.length && out[0][0] === "") out.shift();
    return out;
  }

  const hex = (k) => "#" + k.toString(16).padStart(6, "0");

  function pythonCode(res) {
    const { pal, idx } = buildPalette(res);
    const lines = rowsOf(res, idx);
    const palStr = pal.map((k) => `(${k >> 16}, ${(k >> 8) & 255}, ${k & 255})`);
    const palRows = [];
    for (let i = 0; i < palStr.length; i += 6) palRows.push("    " + palStr.slice(i, i + 6).join(", ") + ",");
    return `# ascii bahçe ile oluşturuldu
# Çalıştırmak için:  python cicek.py
import os
import sys
import time

os.system("")  # Windows terminalinde ANSI renklerini açar
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PALETTE = [
${palRows.join("\n")}
]
KEYS = ${JSON.stringify(KEYS.slice(0, pal.length))}

ART = [
${lines.map((l) => "    " + JSON.stringify(l[0]) + ",").join("\n")}
]

COLORS = [
${lines.map((l) => "    " + JSON.stringify(l[1]) + ",").join("\n")}
]


def draw(delay=0.02):
    lookup = {k: f"\\x1b[38;2;{r};{g};{b}m" for k, (r, g, b) in zip(KEYS, PALETTE)}
    sys.stdout.write("\\x1b[2J\\x1b[H")  # ekranı temizle
    for row, keys in zip(ART, COLORS):
        line, current = [], None
        for ch, k in zip(row, keys):
            if ch != " " and k != current:
                line.append(lookup[k])
                current = k
            line.append(ch)
        sys.stdout.write("".join(line) + "\\x1b[0m\\n")
        sys.stdout.flush()
        time.sleep(delay)


if __name__ == "__main__":
    draw()
`;
  }

  function htmlCode(res) {
    const { pal, idx } = buildPalette(res);
    const lines = rowsOf(res, idx);
    const esc = (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c);
    const body = lines.map(([chars, keys]) => {
      let s = "", cur = null;
      for (let x = 0; x < chars.length; x++) {
        const ch = chars[x], k = keys[x];
        if (ch !== " " && k !== cur) {
          if (cur !== null) s += "</span>";
          s += `<span style="color:${hex(pal[KEYS.indexOf(k)])}">`;
          cur = k;
        }
        s += esc(ch);
      }
      return cur !== null ? s + "</span>" : s;
    }).join("\n");
    return `<!-- ascii bahçe ile oluşturuldu -->
<pre style="display:inline-block;margin:0;padding:20px;border-radius:12px;background:${el.bg.value};font:10px/1.12 'JetBrains Mono',Consolas,'Courier New',monospace;letter-spacing:0">
${body}
</pre>
`;
  }

  const LANGS = {
    py: {
      gen: pythonCode, file: "cicek.py", type: "text/x-python",
      hint: "Kopyala, <code>cicek.py</code> olarak kaydet ve terminalde <code>python cicek.py</code> çalıştır. Resim satır satır renkli olarak çizilir.",
    },
    html: {
      gen: htmlCode, file: "cicek.html", type: "text/html",
      hint: "Kendi sitene, bloguna ya da CodePen'e yapıştır. Renkli ASCII olduğu gibi görünür.",
    },
  };
  let lang = "py";
  let code = "";
  let codeTimer;

  function renderCode() {
    if (!result) return;
    const L = LANGS[lang];
    code = L.gen(result);
    $("#codeHint").innerHTML = L.hint;
    const view = $("#codeView");
    const preview = code.length > 60000 ? code.slice(0, 60000) + "\n…" : code;
    view.textContent = preview;
    if (lang === "py") {
      view.innerHTML = view.innerHTML.replace(/^(\s*#.*)$/gm, '<span class="c">$1</span>')
        .replace(/^(import|def|if|try|except)\b/gm, '<span class="k">$1</span>');
    }
    $("#codeSize").textContent = `${(new Blob([code]).size / 1024).toFixed(1)} KB · ${result.cols}×${result.rows} karakter`;
  }
  const scheduleCode = () => { clearTimeout(codeTimer); codeTimer = setTimeout(renderCode, 150); };

  $("#codeTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    lang = b.dataset.lang;
    $("#codeTabs").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    renderCode();
  });

  // ---------- Dışa aktarma ----------

  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  $("#btnAnim").addEventListener("click", () => result && animate(result));
  $("#btnPng").addEventListener("click", () => {
    if (!result) return;
    cancelAnimationFrame(animId);
    draw(result);
    out.toBlob((b) => download(b, "ascii-bahce.png"), "image/png");
  });
  $("#btnCodeDl").addEventListener("click", () => {
    if (code) download(new Blob([code], { type: LANGS[lang].type + ";charset=utf-8" }), LANGS[lang].file);
  });
  $("#btnCodeCopy").addEventListener("click", async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); toast("Kod panoya kopyalandı"); }
    catch { toast("Kopyalanamadı"); }
  });

  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2000);
  }

  // ---------- Demo çiçek (ilk açılışta) ----------
  function demoFlower() {
    const c = document.createElement("canvas");
    c.width = 600; c.height = 820;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
    // sap
    g.strokeStyle = "#3f8f3a"; g.lineWidth = 22;
    g.beginPath(); g.moveTo(300, 360); g.bezierCurveTo(290, 520, 320, 650, 300, 820); g.stroke();
    // yaprak
    g.fillStyle = "#4caf50";
    g.beginPath(); g.ellipse(360, 600, 70, 26, -0.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(240, 680, 60, 22, 0.6, 0, Math.PI * 2); g.fill();
    // taç yapraklar
    const petals = 9;
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + k * 0.35;
        const len = k ? 120 : 170;
        g.save();
        g.translate(300, 300); g.rotate(a);
        const grad = g.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, k ? "#ff4d7e" : "#b0174a");
        grad.addColorStop(1, k ? "#ffb3c8" : "#ff6f9a");
        g.fillStyle = grad;
        g.beginPath(); g.ellipse(len / 2, 0, len / 2, k ? 34 : 46, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }
    const cg = g.createRadialGradient(300, 300, 5, 300, 300, 55);
    cg.addColorStop(0, "#fff3a0"); cg.addColorStop(1, "#e0a000");
    g.fillStyle = cg; g.beginPath(); g.arc(300, 300, 55, 0, Math.PI * 2); g.fill();
    return c;
  }

  syncOutputs();
  const start = () => { source = demoFlower(); result = convert(); animate(result); renderCode(); };
  (document.fonts ? document.fonts.load(`12px "JetBrains Mono"`).catch(() => {}) : Promise.resolve()).then(start);
})();
