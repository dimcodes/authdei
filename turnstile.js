// --- turnstile.js ---

// ambil elemen
const loginBtn = document.querySelector('button[type="submit"]');
const turnstileTokenInput = document.getElementById("turnstile-token");

// disable tombol saat awal
loginBtn.disabled = true;

// fungsi internal
function enableBtn() {
  loginBtn.disabled = false;
}

function disableBtn() {
  loginBtn.disabled = true;
  turnstileTokenInput.value = "";
}

// callback harus global (Turnstile requirement)
window.tsSuccess = function(token) {
  turnstileTokenInput.value = token;
  enableBtn();
};

window.tsExpired = function() {
  disableBtn();
};

window.tsError = function() {
  disableBtn();
};

// fungsi yang diexport untuk dipakai di file lain
export function verifyTurnstile() {
  return turnstileTokenInput.value.trim() !== "";
}