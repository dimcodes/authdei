import { showAlert } from './ref.js';

let turnstileReady = false;

// Jika verifikasi berhasil
window.tsSuccess = function(token) {
    turnstileReady = true;
    document.getElementById("turnstile-token").value = token;

    // Tidak ada alert di sini
};

// Jika expired
window.tsExpired = function() {
    turnstileReady = false;
    showAlert("warning", "Verifikasi kadaluarsa, silakan ulangi!", 2500);
};

// Jika error
window.tsError = function() {
    turnstileReady = false;
    showAlert("danger", "Terjadi error pada Turnstile. Coba reload halaman!", 3000);
};

// ---------------------------------------------------
// Cek turnstile sebelum submit
// ---------------------------------------------------
export function checkTurnstileBeforeSubmit() {
    if (!turnstileReady) {
        showAlert("warning", "Harap selesaikan verifikasi keamanan!", 2500);
        return false; 
    }
    return true; 
}