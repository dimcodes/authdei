// ref.js
import { db } from './firebase.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// ===== Time Local =====
export const getDateTime = () => {
  const now = new Date();
  const tgl = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
  const pad = n => n.toString().padStart(2, '0');
  const jam = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `${tgl}, ${jam}`;
};

// minta time_ipgeo.js
const API_KEY = "73439af72f6348d18d90387b985073eb";
const TIMEZONE_URL = `https://api.ipgeolocation.io/timezone?apiKey=${API_KEY}`;

export async function minta_time_ipgeo() {
  try {
    const res = await fetch(TIMEZONE_URL, {
      cache: "no-store",
      mode: "cors"
    });
    if (!res.ok) throw new Error("Status " + res.status);

    const data = await res.json();
    // response punya field "time_utc" atau "date_time_txt" — cek dokumentasi
    if (data.time_utc) {
      return Date.parse(data.time_utc); // ms
    }
    if (data.date_time_txt) {
      return Date.parse(data.date_time_txt);
    }
    throw new Error("Format waktu tidak dikenali");
  } catch (err) {
    console.warn("Gagal ambil waktu dari IPGeolocation:", err.message);
    return Date.now();
  }
}


// ===== Simpan data w kadaluarsa =====
export function setlocal(key, value, days = 7) {
  const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
  const data = { value, expiry };
  localStorage.setItem(key, JSON.stringify(data));
}

// ===== Ambil data & cek kadaluarsa =====
export function getlocal(key) {
  const str = localStorage.getItem(key);
  if (!str) return null;
  const data = JSON.parse(str);
  if (Date.now() > data.expiry) {
    localStorage.removeItem(key);
    return null;
  }
  return data.value;
}

// ===== VALIDASI AUTH =====
export function cekauth() {
  const requiredKeys = ["user", "pass", "device_id"];
  const currentPage = window.location.pathname.split("/").pop();
  
  function validasi() {
  if (window.sessionEnding) return; // blok redirect sementara

  const existingKeys = requiredKeys.filter(k => getlocal(k)).length;
  if (existingKeys !== requiredKeys.length) {
    requiredKeys.forEach(k => localStorage.removeItem(k));
    if (currentPage !== "index.html") {
      window.location.replace("index.html");
    }
  } else {
    if (["index.html", "signup.html"].includes(currentPage)) {
      window.location.replace("dashboard.html");
    }
  }
}
  
  validasi();
  window.addEventListener("storage", () => validasi());
  setInterval(validasi, 500);
  const hasAllKeys = requiredKeys.every(k => getlocal(k));
  if (hasAllKeys) {
    monitorThisDevice();
  }
}

// ===== Arah login =====
export function arahkalologin() {
  const requiredKeys = ["user", "pass", "device_id"];
  const hasAllKeys = requiredKeys.every(k => getlocal(k));
  if (hasAllKeys) {
    window.location.replace("dashboard.html");
  }
}

// ===== Hapus data manual =====
export function removelocal(key) {
  localStorage.removeItem(key);
}
export function removelocalm(keys = []) {
  keys.forEach(key => localStorage.removeItem(key));
}

// ===== ALERT SYSTEM =====
export function showAlert(type, message, duration = 3000) {
  const existingAlert = document.querySelector(`.alert.alert-${type}`);
  if (existingAlert) {
    existingAlert.remove();
  }

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;

  alert.innerHTML = `
    <div class="alert-icon">
      ${
        type === 'success' ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" /></svg>` :
        type === 'info' ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/></svg>` :
        type === 'warning' ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
  <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
</svg>
` :
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v6h-2V7Zm0 8h2v2h-2v-2Z"/></svg>`
      }
    </div>
    <div class="alert-content">${message}</div>
    <button class="alert-close material-symbols-outlined">close</button>
  `;
  
  // Inject CSS
  if (!document.getElementById('alert-styles')) {
    const style = document.createElement('style');
    style.id = 'alert-styles';
    style.textContent = `.alert {
  position: fixed;
  top: 30px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 15px;
  box-shadow: 0 4px 12px rgba(255,255,255,0.05);
  color: #fff;
  display: flex;
  align-items: center;
  font-family: 'Poppins', sans-serif;
  z-index: 9999;
  transform: translateY(-5px);
  backdrop-filter: blur(5px);
  border: 1.5px solid;
  gap: 12px;
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.alert.show {
  opacity: 1;
  transform: translateY(0);
}

.alert.hide {
  opacity: 0;
  transform: translateY(-5px);
}

.alert-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-left: -4px;
}

.alert-content {
  flex: 1;
  color: #e5e5e5;
  font-size: 14px;
  font-weight: 500;
}

.alert-close {
  width: 22px;
  height: 22px;
  font-size: 18px;
  border: none;
  background: transparent;
  color: white;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
  margin-left: 8px;
}

.alert-close:hover {
  color: #fff;
}

.alert-success {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.08);
}

.alert-success .alert-icon {
  color: #22c55e;
  filter: drop-shadow(0 0 4px rgba(34, 197, 94, 0.4));
}

.alert-info {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.08);
}

.alert-info .alert-icon {
  color: #3b82f6;
  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.4));
}

.alert-warning {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.08);
}

.alert-warning .alert-icon {
  color: #f59e0b;
  filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.4));
}

.alert-error {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.08);
}

.alert-error .alert-icon {
  color: #ef4444;
  filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.4));
}
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(alert);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      alert.classList.add('show');
    });
  });

  const closeBtn = alert.querySelector('.alert-close');
  closeBtn.addEventListener('click', () => removeAlert(alert));

  if (duration > 0) {
    setTimeout(() => removeAlert(alert), duration);
  }
}

function removeAlert(alert) {
  if (alert.isRemoving) return;
  alert.isRemoving = true;

  alert.classList.remove('show');
  alert.classList.add('hide');

  alert.addEventListener('transitionend', () => alert.remove(), { once: true });
}

// ===== MONITOR DEVICE =====
let alreadyLoggedOut = false;
let monitorListener = null;
let sessionValid = true;
export function isSessionValid() {
  return sessionValid;
}
export async function monitorThisDevice() {
  if (monitorListener) return;

  const user = await getlocal("user");
  if (!user) return;

  const userRef = ref(db, `user_detail/${user}`);
  const currentUA = navigator.userAgent;

  monitorListener = onValue(userRef, (snap) => {
    const data = snap.val() || {};

    // 🔥 CEK AKUN BEKU
    if (data.beku === true && !alreadyLoggedOut) {
      alreadyLoggedOut = true;
      sessionValid = false;
      window.sessionEnding = true;

      showAlert("warning", "Yah.. Akunmu dibekukan!", 3000);
      removelocalm(["user", "pass", "device_id"]);
      setTimeout(() => {
        window.sessionEnding = false; // 1 detik cukup biar alert kelihatan
      }, 1000);
      return;
    }
    
    // 🔥 CEK AKUN PAKSA TANPA ALERT
if (data.paksa === true && !alreadyLoggedOut) {
  alreadyLoggedOut = true;
  sessionValid = false;
  window.sessionEnding = true;
  removelocalm(["user", "pass", "device_id"]);
  setTimeout(() => {
    window.sessionEnding = false;
  }, 1000);
  return;
}

    // 🔥 CEK DEVICE
    const devices = data.devices || {};
    const foundThisDevice = Object.values(devices).some(d => d.userAgent === currentUA);

    if (!foundThisDevice && !alreadyLoggedOut) {
      alreadyLoggedOut = true;
      sessionValid = false;
      window.sessionEnding = true;

      showAlert("warning", "Yah.. Sesi kamu berakhir!", 3000);
      navigator.vibrate([1000]);

      removelocalm(["user", "pass", "device_id"]);

      setTimeout(() => {
        window.sessionEnding = false;
      }, 1000);
    }
  });
}

// ===== SCROLL ELASTIS =====
export function elastis_scrol(c_tujuanscroll) {
  const container = document.querySelector(c_tujuanscroll);
  if (!container) return console.warn("ga ketemu:", c_tujuanscroll);

  let startY = 0;
  let currentTranslate = 0;
  let isDragging = false;
  let isTransitioning = false;

  const getCurrentTranslate = () => {
    const style = window.getComputedStyle(container);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return matrix.m42 || 0;
  };

  const resetscroll = () => {
    if (currentTranslate === 0) return;
    isTransitioning = true;
    container.style.transition = "transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)";
    container.style.transform = "translateY(0)";
    const cleanup = () => {
      isTransitioning = false;
      container.style.transition = "";
      container.removeEventListener("transitionend", cleanup);
      currentTranslate = 0;
    };
    container.addEventListener("transitionend", cleanup);
  };

  container.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) {
        isDragging = false;
        resetscroll();
        return;
      }

      // Jika masih dalam animasi bounce sebelumnya → hentikan langsung
      if (isTransitioning) {
        const nowPos = getCurrentTranslate();
        container.style.transition = "";
        container.style.transform = `translateY(${nowPos}px)`;
        currentTranslate = nowPos;
        isTransitioning = false;
      }

      startY = e.touches[0].pageY - currentTranslate; 
      isDragging = true;
    },
    { passive: true }
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (!isDragging || e.touches.length !== 1 || document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;

      const nowY = e.touches[0].pageY;
      const deltaY = nowY - startY;
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;
      const scrollHeight = container.scrollHeight;

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight;

      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
  e.preventDefault();
  currentTranslate = deltaY / 3;

// keatas
if (currentTranslate < -50) 
  currentTranslate = -50 - (-50 - currentTranslate) * 0.3;
  //kebawah
  if (currentTranslate > 150) 
  currentTranslate = 150 - (150 - currentTranslate) * 0.3;

  container.style.transform = `translateY(${currentTranslate}px)`;
}
    },
    { passive: false }
  );

  container.addEventListener("touchend", (e) => {
    if (e.touches.length === 0) {
      isDragging = false;
      resetscroll();
    }
  });

  container.addEventListener("touchcancel", () => {
    isDragging = false;
    resetscroll();
  });
}


// PW MATA
export function pwmata(pwid, btpwid) {
  const pswrd = document.getElementById(pwid);
  const btsw_p = document.getElementById(btpwid);
  if (!pswrd || !btsw_p) return;

  btsw_p.addEventListener("click", (e) => {
    e.preventDefault();
    const s = pswrd.selectionStart;

    if (pswrd.type === "password") {
      pswrd.type = "text";
      btsw_p.classList.replace("bx-eye", "bx-eye-slash");
    } else {
      pswrd.type = "password";
      btsw_p.classList.replace("bx-eye-slash", "bx-eye");
    }

    pswrd.focus();
    pswrd.setSelectionRange(s, s);
  });
}