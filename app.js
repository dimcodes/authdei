import { db } from './firebase.js';
import { ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getDateTime, setlocal, getlocal, removelocal, removelocalm, showAlert } from './ref.js';
import { verifyTurnstile } from "./turnstile.js";

let hentikan_listener = null;
let user_sekarang = null;

// ============================================
// DEVICE DETECTION FUNCTIONS
// ============================================

function generateDeviceId() {
  return "dev_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

async function getDeviceInfo() {
  const ua = navigator.userAgent || "";
  let model = "Unknown Model";
  let brand = "Unknown Brand";
  let browser = "Unknown Browser";
  let deviceType = "desktop";

  // Deteksi tipe device
  const isMobile = /iPhone|iPod|Android.*Mobile/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  deviceType = isMobile ? "mobile" : isTablet ? "tablet" : "desktop";

  // === STEP 1: Try High Entropy API (Chrome/Edge) ===
  if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    try {
      const data = await navigator.userAgentData.getHighEntropyValues([
        "model",
        "platform",
        "platformVersion",
        "fullVersionList",
        "architecture",
        "bitness"
      ]);

      // Browser detection
      if (Array.isArray(data.fullVersionList)) {
        // Prioritas: Edge > Chrome > Opera > lainnya
        let selectedBrowser = null;
        
        for (const b of data.fullVersionList) {
          if (b.brand.includes("Not") || !b.brand.trim()) continue;
          
          // Prioritas tinggi
          if (b.brand.includes("Edge") || b.brand.includes("Edg")) {
            selectedBrowser = { name: "Edge", version: b.version };
            break;
          } else if (b.brand.includes("Chrome")) {
            selectedBrowser = { name: "Chrome", version: b.version };
          } else if (b.brand.includes("Opera") || b.brand.includes("OPR")) {
            selectedBrowser = { name: "Opera", version: b.version };
            break;
          } else if (!selectedBrowser && b.brand !== "Chromium") {
            selectedBrowser = { name: b.brand, version: b.version };
          }
        }
        
        if (selectedBrowser) {
          const verParts = selectedBrowser.version.split('.');
          const majorMinor = verParts.length >= 2 ? `${verParts[0]}.${verParts[1]}` : verParts[0];
          browser = `${selectedBrowser.name} ${majorMinor}`;
        }
      }

      // Model & Brand detection
      if (data.model && data.model.length > 1) {
        model = data.model;
        brand = extractBrandFromModel(model);
      } else if (data.platform) {
        const result = parseDesktopPlatform(data.platform, data.platformVersion, data.architecture);
        brand = result.brand;
        model = result.model;
      }

      return { brand, model, browser, userAgent: ua, deviceType };
    } catch (err) {
      console.warn("High-entropy API failed:", err);
    }
  }

  // === STEP 2: Fallback to UA String Parsing ===
  const result = parseUserAgent(ua);
  return {
    brand: result.brand || brand,
    model: result.model || model,
    browser: result.browser || browser,
    userAgent: ua,
    deviceType: result.deviceType || deviceType
  };
}

function extractBrandFromModel(model) {
  const lower = model.toLowerCase();
  
  // Xiaomi & Sub-brands
  if (lower.includes("xiaomi") || lower.includes("redmi") || lower.includes("poco") || 
      lower.includes("mi ") || lower.match(/^mi[0-9]/) || lower.match(/\bm[0-9]{4}k/)) return "Xiaomi";
  
  // Samsung
  if (lower.includes("samsung") || lower.includes("sm-") || lower.includes("galaxy") ||
      lower.match(/^sm-[a-z][0-9]/)) return "Samsung";
  
  // Oppo & Sub-brands
  if (lower.includes("oppo") || lower.includes("cph") || lower.match(/^cph[0-9]/)) return "Oppo";
  
  // Vivo & Sub-brands  
  if (lower.includes("vivo") || lower.includes("iqoo") || lower.match(/^v[0-9]{4}/)) return "Vivo";
  
  // Realme
  if (lower.includes("realme") || lower.includes("rmx") || lower.match(/^rmx[0-9]/)) return "Realme";
  
  // OnePlus
  if (lower.includes("oneplus") || lower.includes("one plus") || lower.match(/^a[0-9]{4}/) ||
      lower.match(/\bone\s*plus/)) return "OnePlus";
  
  // Huawei & Honor
  if (lower.includes("huawei") || lower.includes("honor") || lower.includes("hma") ||
      lower.includes("ane") || lower.includes("pot") || lower.includes("jat")) return "Huawei";
  
  // Infinix
  if (lower.includes("infinix") || lower.match(/^x[0-9]{3,4}/)) return "Infinix";
  
  // Tecno
  if (lower.includes("tecno") || lower.match(/^k[a-z][0-9]{1,2}[a-z]?$/)) return "Tecno";
  
  // Asus
  if (lower.includes("asus") || lower.includes("zenfone") || lower.includes("rog phone") ||
      lower.match(/^asus_/)) return "Asus";
  
  // Nokia
  if (lower.includes("nokia") || lower.match(/^ta-[0-9]/)) return "Nokia";
  
  // Sony
  if (lower.includes("sony") || lower.includes("xperia")) return "Sony";
  
  // Motorola
  if (lower.includes("motorola") || lower.includes("moto") || lower.match(/^moto\s?[a-z]/)) return "Motorola";
  
  // Lenovo
  if (lower.includes("lenovo")) return "Lenovo";
  
  // Google
  if (lower.includes("pixel") || lower.includes("nexus")) return "Google";
  
  // LG
  if (lower.includes("lg-") || lower.includes("lg ") || lower.match(/^lg[a-z][0-9]/)) return "LG";
  
  // Apple
  if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ipod")) return "Apple";
  
  // ZTE
  if (lower.includes("zte") || lower.match(/^blade/)) return "ZTE";
  
  // HTC
  if (lower.includes("htc")) return "HTC";
  
  // Meizu
  if (lower.includes("meizu") || lower.match(/^m[0-9]{3}[a-z]?$/)) return "Meizu";
  
  // Coolpad
  if (lower.includes("coolpad")) return "Coolpad";
  
  // Alcatel
  if (lower.includes("alcatel")) return "Alcatel";
  
  // Wiko
  if (lower.includes("wiko")) return "Wiko";
  
  // Sharp
  if (lower.includes("sharp")) return "Sharp";
  
  // Blackberry
  if (lower.includes("blackberry") || lower.includes("bb")) return "Blackberry";
  
  return "Unknown Brand";
}

function parseDesktopPlatform(platform, version, arch) {
  const lower = platform.toLowerCase();
  
  if (lower.includes("mac")) {
    const macModel = parseMacModel(navigator.userAgent, version);
    return { brand: "Apple", model: macModel };
  }
  
  if (lower.includes("windows")) {
    const winModel = parseWindowsVersion(version);
    return { brand: "Microsoft", model: winModel };
  }
  
  if (lower.includes("linux")) {
    return { brand: "Linux", model: `Linux ${arch || "x64"}` };
  }
  
  if (lower.includes("chrome")) {
    return { brand: "Google", model: "Chrome OS" };
  }
  
  return { brand: "Unknown Brand", model: `${platform} Device` };
}

function parseMacModel(ua, version) {
  if (/Macintosh.*Intel/i.test(ua)) {
    const match = ua.match(/Mac OS X (\d+)[._](\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const macVersion = getMacOSName(major);
      return `Mac (${macVersion})`;
    }
    return "Mac (Intel)";
  }
  
  if (/Macintosh.*ARM/i.test(ua) || /Macintosh.*Apple/i.test(ua)) {
    return "Mac (Apple Silicon)";
  }
  
  return "Mac";
}

function getMacOSName(major) {
  const names = {
    15: "Sequoia",
    14: "Sonoma", 
    13: "Ventura",
    12: "Monterey",
    11: "Big Sur",
    10: "Catalina/Mojave"
  };
  return names[major] || `macOS ${major}`;
}

function parseWindowsVersion(version) {
  if (!version) return "Windows PC";
  
  const major = parseInt(version.split('.')[0]);
  
  if (major >= 13) return "Windows 11";
  if (major >= 10) return "Windows 10";
  if (major >= 6.3) return "Windows 8.1";
  if (major >= 6.2) return "Windows 8";
  if (major >= 6.1) return "Windows 7";
  
  return "Windows PC";
}

function parseUserAgent(ua) {
  const lowerUA = ua.toLowerCase();
  let brand = "Unknown Brand";
  let model = "Unknown Model";
  let browser = "Unknown Browser";
  let deviceType = "desktop";

  // Browser Detection (dengan versi major.minor)
  if (ua.includes("Edg/")) {
    const ver = ua.match(/Edg\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Edge ${parts[0]}.${parts[1]}` : `Edge ${parts[0]}`;
    }
  } else if (ua.includes("OPR/") || ua.includes("Opera/")) {
    const ver = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Opera ${parts[0]}.${parts[1]}` : `Opera ${parts[0]}`;
    }
  } else if (ua.includes("Chrome/") && !ua.includes("Edg")) {
    const ver = ua.match(/Chrome\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Chrome ${parts[0]}.${parts[1]}` : `Chrome ${parts[0]}`;
    }
  } else if (ua.includes("Firefox/")) {
    const ver = ua.match(/Firefox\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Firefox ${parts[0]}.${parts[1]}` : `Firefox ${parts[0]}`;
    }
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    const ver = ua.match(/Version\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Safari ${parts[0]}.${parts[1]}` : `Safari ${parts[0]}`;
    }
  } else if (ua.includes("SamsungBrowser/")) {
    const ver = ua.match(/SamsungBrowser\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Samsung Internet ${parts[0]}.${parts[1]}` : `Samsung Internet ${parts[0]}`;
    }
  } else if (ua.includes("UCBrowser/")) {
    const ver = ua.match(/UCBrowser\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `UC Browser ${parts[0]}.${parts[1]}` : `UC Browser ${parts[0]}`;
    }
  } else if (ua.includes("Brave/") || ua.includes("Brave Chrome")) {
    const ver = ua.match(/Chrome\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Brave ${parts[0]}.${parts[1]}` : `Brave ${parts[0]}`;
    } else {
      browser = "Brave";
    }
  } else if (ua.includes("Vivaldi/")) {
    const ver = ua.match(/Vivaldi\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Vivaldi ${parts[0]}.${parts[1]}` : `Vivaldi ${parts[0]}`;
    }
  } else if (ua.includes("YaBrowser/")) {
    const ver = ua.match(/YaBrowser\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Yandex ${parts[0]}.${parts[1]}` : `Yandex ${parts[0]}`;
    }
  } else if (ua.includes("Puffin/")) {
    const ver = ua.match(/Puffin\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Puffin ${parts[0]}.${parts[1]}` : `Puffin ${parts[0]}`;
    }
  } else if (ua.includes("Whale/")) {
    const ver = ua.match(/Whale\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Naver Whale ${parts[0]}.${parts[1]}` : `Naver Whale ${parts[0]}`;
    }
  } else if (ua.includes("MIUI/")) {
    const ver = ua.match(/Chrome\/([\d.]+)/);
    if (ver) {
      const parts = ver[1].split('.');
      browser = parts.length >= 2 ? `Mi Browser ${parts[0]}.${parts[1]}` : `Mi Browser ${parts[0]}`;
    } else {
      browser = "Mi Browser";
    }
  }

  // Android Devices
  if (/android/i.test(ua)) {
    deviceType = /mobile/i.test(ua) ? "mobile" : "tablet";
    
    const buildMatch = ua.match(/;\s*([^;)]+)\s+Build\//i);
    if (buildMatch) {
      let rawModel = buildMatch[1].trim().replace(/\s+/g, ' ');
      
      // Special handling untuk Samsung
      if (rawModel.match(/SM-[A-Z]\d+/i)) {
        brand = "Samsung";
        const seriesMatch = rawModel.match(/SM-([A-Z])\d+/i);
        if (seriesMatch) {
          const series = {
            'S': 'Galaxy S',
            'A': 'Galaxy A', 
            'M': 'Galaxy M',
            'F': 'Galaxy F',
            'J': 'Galaxy J',
            'N': 'Galaxy Note'
          }[seriesMatch[1].toUpperCase()] || 'Galaxy';
          model = `${series} ${rawModel}`;
        } else {
          model = `Samsung ${rawModel}`;
        }
      } else {
        // Deteksi brand dari model
        brand = extractBrandFromModel(rawModel);
        
        // Cek dari User Agent jika masih unknown
        if (brand === "Unknown Brand") {
          if (lowerUA.includes("xiaomi") || lowerUA.includes("redmi") || lowerUA.includes("poco")) brand = "Xiaomi";
          else if (lowerUA.includes("samsung")) brand = "Samsung";
          else if (lowerUA.includes("realme")) brand = "Realme";
          else if (lowerUA.includes("oppo")) brand = "Oppo";
          else if (lowerUA.includes("vivo")) brand = "Vivo";
          else if (lowerUA.includes("infinix")) brand = "Infinix";
          else if (lowerUA.includes("tecno")) brand = "Tecno";
          else if (lowerUA.includes("huawei") || lowerUA.includes("honor")) brand = "Huawei";
          else if (lowerUA.includes("asus")) brand = "Asus";
          else if (lowerUA.includes("nokia")) brand = "Nokia";
          else if (lowerUA.includes("oneplus")) brand = "OnePlus";
          else if (lowerUA.includes("motorola") || lowerUA.includes("moto")) brand = "Motorola";
          else if (lowerUA.includes("lenovo")) brand = "Lenovo";
          else if (lowerUA.includes("sony")) brand = "Sony";
          else if (lowerUA.includes("lg")) brand = "LG";
          else if (lowerUA.includes("zte")) brand = "ZTE";
          else if (lowerUA.includes("meizu")) brand = "Meizu";
          else brand = "Android";
        }
        
        // Gabungkan brand dengan model jika brand sudah terdeteksi
        const lowerModel = rawModel.toLowerCase();
        const lowerBrand = brand.toLowerCase();
        
        if (brand !== "Unknown Brand" && brand !== "Android" && !lowerModel.includes(lowerBrand)) {
          model = `${brand} ${rawModel}`;
        } else {
          model = rawModel;
        }
      }
    } else {
      // Tidak ada Build info (biasanya Firefox/Brave untuk privacy)
      // Coba deteksi brand dari UA string
      if (lowerUA.includes("xiaomi") || lowerUA.includes("redmi") || lowerUA.includes("poco")) {
        brand = "Xiaomi";
        model = "Xiaomi Device";
      } else if (lowerUA.includes("samsung")) {
        brand = "Samsung";
        model = "Samsung Device";
      } else if (lowerUA.includes("realme")) {
        brand = "Realme";
        model = "Realme Device";
      } else if (lowerUA.includes("oppo")) {
        brand = "Oppo";
        model = "Oppo Device";
      } else if (lowerUA.includes("vivo")) {
        brand = "Vivo";
        model = "Vivo Device";
      } else if (lowerUA.includes("infinix")) {
        brand = "Infinix";
        model = "Infinix Device";
      } else if (lowerUA.includes("tecno")) {
        brand = "Tecno";
        model = "Tecno Device";
      } else if (lowerUA.includes("huawei") || lowerUA.includes("honor")) {
        brand = "Huawei";
        model = "Huawei Device";
      } else if (lowerUA.includes("asus")) {
        brand = "Asus";
        model = "Asus Device";
      } else if (lowerUA.includes("nokia")) {
        brand = "Nokia";
        model = "Nokia Device";
      } else if (lowerUA.includes("oneplus")) {
        brand = "OnePlus";
        model = "OnePlus Device";
      } else if (lowerUA.includes("motorola") || lowerUA.includes("moto")) {
        brand = "Motorola";
        model = "Motorola Device";
      } else if (lowerUA.includes("lenovo")) {
        brand = "Lenovo";
        model = "Lenovo Device";
      } else if (lowerUA.includes("sony")) {
        brand = "Sony";
        model = "Sony Device";
      } else if (lowerUA.includes("lg")) {
        brand = "LG";
        model = "LG Device";
      } else if (lowerUA.includes("pixel")) {
        brand = "Google";
        model = "Google Pixel";
      } else {
        brand = "Android";
        model = "Android Device";
      }
    }
  }
  else if (/iphone/i.test(ua)) {
    brand = "Apple";
    deviceType = "mobile";
    const osMatch = ua.match(/OS (\d+)_(\d+)/);
    model = osMatch ? `iPhone (iOS ${osMatch[1]})` : "iPhone";
  }
  else if (/ipad/i.test(ua)) {
    brand = "Apple";
    deviceType = "tablet";
    const osMatch = ua.match(/OS (\d+)_(\d+)/);
    model = osMatch ? `iPad (iPadOS ${osMatch[1]})` : "iPad";
  }
  else if (/ipod/i.test(ua)) {
    brand = "Apple";
    model = "iPod Touch";
    deviceType = "mobile";
  }
  else if (/macintosh|mac os x/i.test(ua)) {
    brand = "Apple";
    model = parseMacModel(ua);
    deviceType = "desktop";
  }
  else if (/windows nt/i.test(ua)) {
    brand = "Microsoft";
    const ntMatch = ua.match(/Windows NT ([\d.]+)/);
    if (ntMatch) {
      const ntVer = parseFloat(ntMatch[1]);
      if (ntVer >= 10) model = "Windows 10/11";
      else if (ntVer >= 6.3) model = "Windows 8.1";
      else if (ntVer >= 6.2) model = "Windows 8";
      else if (ntVer >= 6.1) model = "Windows 7";
      else model = "Windows PC";
    } else {
      model = "Windows PC";
    }
    deviceType = "desktop";
  }
  else if (/linux/i.test(ua)) {
    brand = "Linux";
    model = "Linux PC";
    deviceType = "desktop";
    
    if (/CrOS/i.test(ua)) {
      brand = "Google";
      model = "Chromebook";
    }
  }

  return { brand, model, browser, deviceType };
}

async function getLocationFromIpApi() {
  try {
    const res = await fetch("https://ipinfo.io/json");
    if (!res.ok) throw new Error("Gagal mengambil lokasi");
    const j = await res.json();

    return {
      city: j.city || "-",
      province: j.region || j.region_code || "-",
      country: j.country_name || j.country || "-"
    };
  } catch (err) {
    console.warn("Gagal ambil lokasi:", err);
    return { city: "-", province: "-", country: "-" };
  }
}

async function buildDevicePayload() {
  const dev = await getDeviceInfo();
  const loc = await getLocationFromIpApi();

  return {
    brand: dev.brand,
    model: dev.model,
    device: `${dev.brand || "-"}, ${dev.model || "-"}`,
    browser: dev.browser,
    deviceType: dev.deviceType,
    city: loc.city || "-",
    province: loc.province || "-",
    country: loc.country || "-",
    userAgent: dev.userAgent
  };
}

function getServerTimeMs() {
  return new Promise((resolve) => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    onValue(offsetRef, (snap) => {
      const offset = snap.val() || 0;
      const now = Date.now() + offset;
      resolve(now);
    }, { onlyOnce: true });
  });
}

// ============================================
// LOGIN FUNCTION
// ============================================

window.login = async function login(event) {
  if (event) event.preventDefault();
  
  if (!verifyTurnstile()) {
  showAlert("warning", "Verifikasi keamanan belum selesai / expired!", 2500);
  return;
}
  const usernamei = document.getElementById("username");
  const passwordi = document.getElementById("password");
  const username = usernamei.value.trim();
  const password = passwordi.value.trim();
  
  if (!username || !password) {
    return showAlert("info", "Inputan tidak boleh kosong!", 2500);
  }

  const userRef = ref(db, `user_detail/${username}`);
  const snap = await get(userRef);

  if (!snap.exists()) {
    showAlert("warning", `Akun ${username} tidak ditemukan!`, 2500);
    usernamei.value = "";
    passwordi.value = "";
    return;
  }

  const data = snap.val();
  const now = await getServerTimeMs();
  
  // paksa
  if(data.paksa === true){
     showAlert("info", 'Akun ini dinonaktifkan sementara!', 2500);
     usernamei.value = "";
    passwordi.value = "";
    return;
  }
  
  // cek akun beku
  if (data.beku && data.beku_sampai && now < data.beku_sampai) {
    const sisaMenit = Math.ceil((data.beku_sampai - now) / 60000);
    showAlert("warning", `Akun dibekukan selama ${sisaMenit} menit.`, 4000);
    return;
  }

  // Password validation
  if (data.password !== password) {
    const percobaan = (data.percobaan || 0) + 1;
    const updates = { percobaan };

    if (percobaan >= 3) {
      updates.percobaan = 0;
      updates.beku = true;
      updates.beku_sampai = now + 2 * 60 * 60 * 1000; // 2 hours
      showAlert("info", "Salah 3x. Akun dibekukan 2 jam!", 4000);
    } else {
      showAlert("warning", `Password salah! Percobaan ke-${percobaan} dari 3.`, 3000);
    }

    await set(userRef, { ...data, ...updates });
    usernamei.value = "";
    passwordi.value = "";
    return;
  }

  // Reset attempt counter on successful password
  await set(userRef, { ...data, percobaan: 0, beku: false, beku_sampai: 0 });

  // Save session
  setlocal("user", username);
  setlocal("pass", password);

  // Generate device info and save device_id
  const deviceInfo = await buildDevicePayload();
  const devicesRef = ref(db, `user_detail/${username}/devices`);
  const devicesSnap = await get(devicesRef);
  let deviceIdToUse = null;

  if (devicesSnap.exists()) {
    const devices = devicesSnap.val();
    for (const [id, d] of Object.entries(devices)) {
      if (d.userAgent === deviceInfo.userAgent) {
        deviceIdToUse = id;
        break;
      }
    }
  }

  if (!deviceIdToUse) deviceIdToUse = generateDeviceId();

  await set(ref(db, `user_detail/${username}/devices/${deviceIdToUse}`), {
    ...deviceInfo,
    login_at: getDateTime(),
  });

  setlocal("device_id", deviceIdToUse);

  showAlert("success", `Login sukses, Hai ${username}!`, 3000);

  setTimeout(() => {
    window.location.replace("dashboard.html");
  }, 1500);

  document.getElementById("input").reset();
};

// ============================================
// SIGNUP FUNCTION
// ============================================

function bikintoken() {
  return Math.random().toString(36).substring(2, 7);
}

window.signup = async function signup(event) {
  if (event) event.preventDefault();
  
  if (!verifyTurnstile()) {
  showAlert("warning", "Verifikasi keamanan belum selesai / expired!", 2500);
  return;
}
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirm = document.getElementById("confirm-password").value.trim();

  if (!username || !password || !confirm) {
    showAlert("warning", 'Isi semua field!', 2500);
    return;
  }

  if (password !== confirm) {
    showAlert("info", 'Konfirmasi password tidak cocok!', 2500);
    document.getElementById("confirm-password").value = "";
    return;
  }

  const userRef = ref(db, `user_detail/${username}`);
  const snap = await get(userRef);

  if (snap.exists()) {
    showAlert("info", `Username ${username} sudah dipakai!`, 2500);
    document.getElementById("input").reset();
    return;
  }

  // Generate device info
  const deviceInfo = await buildDevicePayload();
  const createdAt = getDateTime();

  // Simpan user dengan info created (bukan devices)
  await set(userRef, {
    username,
    password,
    paksa: false,
    created: {
      device: `${deviceInfo.brand}, ${deviceInfo.model}`,
      browser: deviceInfo.browser,
      created_at: createdAt,
      city: deviceInfo.city,
      province: deviceInfo.province,
      country: deviceInfo.country,
      deviceType: deviceInfo.deviceType
    }
  });

  const token = bikintoken();
  sessionStorage.setItem('c-t', token);
  
  window.location.replace("success.html");
};