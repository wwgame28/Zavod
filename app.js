// Каталог: названия, цены и фото футболок — с amurmania.ru (фото грузятся оттуда напрямую).
// SVG-рисунок — для вешалки и как запасной вариант, если фото не загрузилось.
const SIZES = ["S-M", "M-L", "L-XL"];
const UP = "https://amurmania.ru/wp-content/uploads/2026/03/";
const photos = (...ids) => ids.map((id) => `${UP}${id}-600x900.jpg`);
const TEE_META = "Хлопок · оверсайз · DTF-печать";

const PRODUCTS = [
  { id: "amur", type: "tee", photos: photos("ea64ff6f7b276fc3d0fa24fd9bb8d626", "7182900fefab0719a15369c2f706935a", "6a2cde585cc161b9eb4d269adaa23f73"),
    name: "Футболка Oversize «АМУР»", price: 3200, meta: TEE_META,
    print: { lines: ["АМУР"], size: 46 },
    colors: [["Белый", "#f4f3ef"], ["Чёрный", "#1b1b1d"], ["Красный", "#c8202c"]] },
  { id: "space", type: "tee", photos: photos("7a75882c8da58a90fa8c7c0ce3d14d88", "e5a62bd9500758ca3592e9e38beedd1a", "0e3ff12c7983b1a1837ec7ab7af062c8"),
    name: "Футболка Oversize «АМУР SPACE»", price: 3200, meta: TEE_META,
    print: { lines: ["АМУР", "SPACE"], size: 34, graphic: "star" },
    colors: [["Чёрный", "#1b1b1d"], ["Белый", "#f4f3ef"], ["Графит", "#4a4d52"]] },
  { id: "zip-america", type: "zip", name: "ZIP-худи «Америка» с начёсом", price: 7000, meta: "Футер с начёсом · молния",
    print: { lines: ["АМУРМАНИЯ"], size: 9, chest: true },
    colors: [["Винный", "#6d1f2c"], ["Графит", "#3c3f44"], ["Изумрудный графит", "#24433d"]] },
  { id: "cosmo", type: "tee", photos: photos("923332ba8742d98c857f495a838aeee7", "a97df2919a1d06d6cb585b0a780c7186", "ba35529dc20d9feb717ef1eb148957f4"),
    name: "Футболка Oversize «КОСМОНАВТ»", price: 3200, meta: TEE_META,
    print: { lines: ["КОСМО", "НАВТ"], size: 34, graphic: "orbit" },
    colors: [["Жёлтый", "#efc531"], ["Белый", "#f4f3ef"], ["Чёрный", "#1b1b1d"]] },
  { id: "vest", type: "tee", photos: photos("2197fedc3e7697a598f717a1c27e244f", "3970683d70c413d85c83a8df3fb9e548", "8854240ab679b2bd486b949eb80ca86d"),
    name: "Футболка Oversize «БЛАГАЯ ВЕСТЬ»", price: 3200, meta: TEE_META,
    print: { lines: ["БЛАГАЯ", "ВЕСТЬ"], size: 30 },
    colors: [["Белый", "#f4f3ef"], ["Голубой", "#9fb8cf"], ["Чёрный", "#1b1b1d"]] },
  { id: "zip-diag", type: "zip", name: "ZIP-худи футер 3-х нитка «Диагональ»", price: 7000, meta: "Футер трёхнитка · молния",
    print: { lines: ["АМУРМАНИЯ"], size: 9, chest: true },
    colors: [["Красный", "#b9222c"], ["Нефть", "#1f3a44"], ["Розовый", "#e7a9b6"], ["Фюме", "#8a8580"], ["Кофе", "#5b4335"]] },
  { id: "moon", type: "tee", photos: photos("7fbab29a958832b06eb9da99ac7d08e3", "3f460ec591d947f9ae95cb11a991a07c", "e3ef7449116add26675810fe7750bdf8"),
    name: "Футболка Oversize «КОТ НА ЛУНЕ»", price: 3200, meta: TEE_META,
    print: { lines: ["КОТ НА", "ЛУНЕ"], size: 30, graphic: "moon" },
    colors: [["Чёрный", "#1b1b1d"], ["Песочный", "#d8c7a6"], ["Белый", "#f4f3ef"]] },
  { id: "zemlya", type: "tee", photos: photos("39f39d7b444517079049e1f5f8e481b7", "70c89bd20cf48435b91d5e5d101b0443", "42176489895eda9b9c70f94271df5345"),
    name: "Футболка Oversize «ЗЕМЛЯ АМУРСКАЯ»", price: 3200, meta: TEE_META,
    print: { lines: ["ЗЕМЛЯ", "АМУРСКАЯ"], size: 26 },
    colors: [["Хаки", "#5f6448"], ["Белый", "#f4f3ef"], ["Чёрный", "#1b1b1d"]] },
  // Остальные футболки — только в каталоге (на вешалке 8 вещей)
  { id: "arka", type: "tee", rack: false, name: "Футболка Oversize «АРКА»", price: 3200, meta: TEE_META,
    photos: photos("340c8f9164f3a52559cb9d247c9d1869", "7eaaf4b05914bb18610e362b4224f044"),
    print: { lines: ["АРКА"], size: 46 }, colors: [["Белый", "#f4f3ef"]] },
  { id: "doroga", type: "tee", rack: false, name: "Футболка Oversize «ДОРОГА В КОСМОС»", price: 3200, meta: TEE_META,
    photos: photos("cfd34aca5a6e666261b6bdf7e9c5c8cb", "920f377ab48b183fe9a8a39b392167e7", "4fcc80c70d6c2969bf78c047dabdf6cd"),
    print: { lines: ["ДОРОГА", "В КОСМОС"], size: 26, graphic: "star" }, colors: [["Чёрный", "#1b1b1d"]] },
  { id: "zvezdy", type: "tee", rack: false, name: "Футболка Oversize «ЗВЕЗДЫ»", price: 3200, meta: TEE_META,
    photos: photos("881c253ce9db32cd6d7bf8ab143213a6", "b5a56c149f49ce13e320d41759259b7d", "1f728ef6435f26fc5ce5a216b01984b7", "c663fb064cf3627e85335a4f7a769881"),
    print: { lines: ["ЗВЁЗДЫ"], size: 36, graphic: "star" }, colors: [["Чёрный", "#1b1b1d"]] },
  { id: "kover-miru", type: "tee", rack: false, name: "Футболка Oversize «КОВЕР МИРУ АМУР»", price: 3200, meta: TEE_META,
    photos: photos("ca688a3a119fd089056d2c28af3e962c", "45f855d3b83ed705c6f2f58c61d0ba60", "24e2778ddae742daf8fda2c8d9f408ee"),
    print: { lines: ["МИРУ", "АМУР"], size: 34 }, colors: [["Белый", "#f4f3ef"]] },
  { id: "kover-1", type: "tee", rack: false, name: "Футболка Oversize «КОВЕР СССР №1»", price: 3200, meta: TEE_META,
    photos: photos("8e0b664007bc5d0727b61761b9ef95db", "d9851ceaaa829688c01085c9f47b4239", "868cdc8f3c16fd29cf0207d555ed86d7", "921c730db48db8eb2afc9531cdbfd0f2"),
    print: { lines: ["КОВЁР", "№1"], size: 34 }, colors: [["Белый", "#f4f3ef"]] },
  { id: "kover-2", type: "tee", rack: false, name: "Футболка Oversize «КОВЕР СССР №2»", price: 3200, meta: TEE_META,
    photos: photos("5218ff0fe37435b5f604d79c0c7f5f71", "eefb95bc463e266bdb61572a66e6d517", "46a2eb0a921123a7e2a3141335f57677", "3e4263d4f29b03887f75d59e022c417d"),
    print: { lines: ["КОВЁР", "№2"], size: 34 }, colors: [["Белый", "#f4f3ef"]] },
];

// ---------- SVG-одежда ----------
const SHAPES = {
  tee: "M96,52 L58,64 L16,108 L48,142 L74,122 L74,338 Q150,348 226,338 L226,122 L252,142 L284,108 L242,64 L204,52 Q150,86 96,52 Z",
  zip: "M100,58 L60,70 L34,132 L20,322 L52,328 L74,168 L74,340 Q150,350 226,340 L226,168 L248,328 L280,322 L266,132 L240,70 L200,58 Z",
};

function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

function printSvg(p, fill) {
  const ink = isDark(fill) ? "#f4f3ef" : "#141414";
  const accent = "#d7192a";
  let g = "";
  if (p.chest) {
    return `<text x="200" y="140" font-family="Unbounded" font-weight="900" font-size="${p.size}" fill="${ink}" text-anchor="middle" opacity=".9">${p.lines[0]}</text>`;
  }
  const top = p.graphic ? 190 : 175;
  if (p.graphic === "moon") g = `<circle cx="150" cy="140" r="30" fill="#f2d36b"/><circle cx="163" cy="132" r="26" fill="${fill}"/>`;
  if (p.graphic === "star") g = `<path d="M150,108 l9,22 24,2 -18,15 6,23 -21,-13 -21,13 6,-23 -18,-15 24,-2z" fill="${accent}"/>`;
  if (p.graphic === "orbit") g = `<ellipse cx="150" cy="140" rx="46" ry="14" fill="none" stroke="${accent}" stroke-width="4" transform="rotate(-18 150 140)"/><circle cx="150" cy="140" r="13" fill="${ink}"/>`;
  const lines = p.lines.map((l, i) =>
    `<text x="150" y="${top + i * (p.size * 0.98)}" font-family="Unbounded" font-weight="900" font-size="${p.size}" fill="${ink}" text-anchor="middle" letter-spacing="-1">${l}</text>`).join("");
  return g + lines;
}

function garmentSvg(product, colorIdx = 0) {
  const fill = product.colors[colorIdx][1];
  const d = SHAPES[product.type];
  const stroke = isDark(fill) ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.12)";
  const extra = product.type === "zip"
    ? `<path d="M100,58 Q150,8 200,58 Q192,104 150,110 Q108,104 100,58 Z" fill="${fill}" stroke="${stroke}"/>
       <path d="M100,58 Q150,8 200,58 Q192,104 150,110 Q108,104 100,58 Z" fill="url(#fold)" opacity=".7"/>
       <path d="M150,110 L150,344" stroke="${isDark(fill) ? "#8d8d8d" : "#555"}" stroke-width="3" stroke-dasharray="2 2"/>
       <rect x="146" y="112" width="8" height="16" rx="2" fill="#9a9a9a"/>
       <path d="M86,262 Q120,254 140,262 L140,300 Q110,306 86,300 Z M160,262 Q180,254 214,262 L214,300 Q190,306 160,300 Z" fill="#000" opacity=".08"/>
       <path d="M74,322 L226,322" stroke="#000" stroke-opacity=".1" stroke-width="10"/>`
    : `<path d="M96,52 Q150,86 204,52" fill="none" stroke="${isDark(fill) ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.18)"}" stroke-width="6"/>`;
  return `<svg viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${product.name}, ${product.colors[colorIdx][0]}">
    <path d="M150,34 L150,22 Q150,8 162,8 Q173,8 173,19" fill="none" stroke="#8f8d87" stroke-width="4" stroke-linecap="round"/>
    <path d="M150,34 L84,58 M150,34 L216,58" stroke="#8f8d87" stroke-width="5" stroke-linecap="round"/>
    <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    ${printSvg(product.print, fill)}
    <path d="${d}" fill="url(#fold)"/>
    <path d="${d}" fill="url(#drop)"/>
    ${extra}
  </svg>`;
}

// Фото товара; если не загрузилось — подменяется SVG-рисунком (см. обработчик error ниже)
const photoImg = (i, k = 0, cls = "photo") =>
  `<img class="${cls}" src="${PRODUCTS[i].photos[k]}" alt="${PRODUCTS[i].name}, фото ${k + 1}" data-pid="${i}" loading="lazy">`;
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.tagName !== "IMG" || img.dataset.pid === undefined) return;
  img.closest(".is-photo")?.classList.remove("is-photo");
  img.outerHTML = garmentSvg(PRODUCTS[+img.dataset.pid]);
}, true);

const rub = (n) => n.toLocaleString("ru-RU") + " ₽";
const $ = (s) => document.querySelector(s);

// ---------- Вешалка ----------
const rackItems = $("#rackItems");
const caption = $("#rackCaption");
const defaultCaption = caption.innerHTML;

PRODUCTS.forEach((p, i) => {
  if (p.rack === false) return;
  const li = document.createElement("li");
  li.innerHTML = `<button class="rack__item" type="button" aria-label="${p.name}">${garmentSvg(p)}</button>`;
  const btn = li.firstChild;
  btn.style.animationDelay = `${-i * 0.7}s`;
  btn.addEventListener("mouseenter", () => showCaption(p));
  btn.addEventListener("focus", () => showCaption(p));
  btn.addEventListener("mouseleave", () => (caption.innerHTML = defaultCaption));
  btn.addEventListener("click", () => openDetail(i));
  rackItems.appendChild(li);
});
function showCaption(p) {
  const variants = p.photos ? `${p.photos.length} фото` : `${p.colors.length} цвет${p.colors.length > 4 ? "ов" : "а"}`;
  caption.innerHTML = `<b>${p.name}</b>${rub(p.price)} · ${variants}`;
}

// ---------- Каталог ----------
const grid = $("#grid");
function renderGrid(filter = "all") {
  grid.innerHTML = "";
  PRODUCTS.forEach((p, i) => {
    if (filter !== "all" && p.type !== filter) return;
    const li = document.createElement("li");
    const dots = p.photos ? "" : p.colors.map(([, c]) => `<i style="background:${c}"></i>`).join("");
    const pic = p.photos ? `<span class="card__pic is-photo">${photoImg(i)}</span>` : `<span class="card__pic card__pic--svg">${garmentSvg(p)}</span>`;
    li.innerHTML = `<button class="card" type="button">${pic}<h3>${p.name}</h3><p><b>${rub(p.price)}</b><span class="dots">${dots}</span></p></button>`;
    li.firstChild.addEventListener("click", () => openDetail(i));
    grid.appendChild(li);
  });
}
renderGrid();
$("#filters").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-on", c === b));
  renderGrid(b.dataset.f);
});

// ---------- Детальный просмотр ----------
const detail = $("#detail");
const state = { i: 0, color: 0, size: 1, lastFocus: null };

function openDetail(i) {
  state.lastFocus = document.activeElement;
  state.i = i; state.color = 0; state.size = 1;
  detail.hidden = false;
  document.body.style.overflow = "hidden";
  renderDetail();
  $("#dAdd").focus();
}
function closeDetail() {
  detail.hidden = true;
  document.body.style.overflow = "";
  state.lastFocus?.focus();
}
function renderDetail(animate = true) {
  const p = PRODUCTS[state.i];
  const main = $("#dMain");
  // Для товаров с фото state.color — номер фото, для остальных — номер цвета
  main.classList.toggle("is-photo", !!p.photos);
  main.innerHTML = p.photos ? photoImg(state.i, state.color) : garmentSvg(p, state.color);
  if (animate) { main.classList.remove("enter"); void main.offsetWidth; main.classList.add("enter"); }
  $("#dName").textContent = p.name;
  $("#dMeta").textContent = p.photos
    ? `${p.meta} · фото ${state.color + 1} из ${p.photos.length}`
    : `${p.meta} · ${p.colors[state.color][0]}`;
  $("#dPrice").textContent = rub(p.price);

  $("#dColors").innerHTML = p.photos ? "" : p.colors.map(([n, c], k) =>
    `<button class="swatch${k === state.color ? " is-on" : ""}" style="background:${c}" data-k="${k}" aria-label="${n}" aria-pressed="${k === state.color}" title="${n}"></button>`).join("");
  $("#dSizes").innerHTML = SIZES.map((s, k) =>
    `<button class="chip${k === state.size ? " is-on" : ""}" data-k="${k}" aria-pressed="${k === state.size}">${s}</button>`).join("");
  const variants = p.photos || p.colors;
  $("#dAlts").innerHTML = variants.map((c, k) => k === state.color ? "" : p.photos
    ? `<li><button class="is-photo" data-k="${k}" aria-label="Фото ${k + 1}">${photoImg(state.i, k, "thumb")}</button></li>`
    : `<li><button data-k="${k}" aria-label="Цвет: ${c[0]}">${garmentSvg(p, k)}</button></li>`).join("");
}
$("#dColors").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) { state.color = +b.dataset.k; renderDetail(); } });
$("#dAlts").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) { state.color = +b.dataset.k; renderDetail(); } });
$("#dSizes").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) { state.size = +b.dataset.k; renderDetail(false); } });
const step = (d) => { state.i = (state.i + d + PRODUCTS.length) % PRODUCTS.length; state.color = 0; renderDetail(); };
$("#dPrev").addEventListener("click", () => step(-1));
$("#dNext").addEventListener("click", () => step(1));
$("#dBack").addEventListener("click", closeDetail);
document.addEventListener("keydown", (e) => {
  if (detail.hidden) return;
  if (e.key === "Escape") closeDetail();
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});
let touchX = null;
detail.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
detail.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  touchX = null;
});

// ---------- Корзина (локально, в браузере) ----------
let cart = [];
try { cart = JSON.parse(localStorage.getItem("amur-cart") || "[]"); } catch { cart = []; }
const cartCount = $("#cartCount");
const updateCart = () => { cartCount.textContent = cart.length; };
updateCart();
$("#dAdd").addEventListener("click", () => {
  const p = PRODUCTS[state.i];
  const color = p.photos ? "" : `, ${p.colors[state.color][0]}`;
  cart.push({ id: p.id, color: color.slice(2), size: SIZES[state.size] });
  try { localStorage.setItem("amur-cart", JSON.stringify(cart)); } catch {}
  updateCart();
  const btn = $("#cartBtn");
  btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  toast(`Добавлено: ${p.name}${color}, ${SIZES[state.size]}`);
});
$("#cartBtn").addEventListener("click", () => {
  toast(cart.length ? `В корзине ${cart.length} шт. · оформление — по телефону +7 (914) 062-00-01` : "Корзина пуста — выберите вещь на вешалке");
});
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ---------- Бегущая строка ----------
const phrases = ["Носи дух Амурской области", "АмурМания", "Сделано в Благовещенске", "Новый дроп", "Собственное производство с 2018"];
const track = $("#ticker");
track.innerHTML = [...phrases, ...phrases, ...phrases, ...phrases].map((t) => `<span>${t}</span>`).join("");

// ---------- Счётчики ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target, end = +el.dataset.count, t0 = performance.now();
    const suffix = (el.dataset.plus !== undefined ? "+" : "") + (el.dataset.suffix || "");
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 1400), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
      el.textContent = v.toLocaleString("ru-RU") + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    io.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll("[data-count]").forEach((el) => io.observe(el));
