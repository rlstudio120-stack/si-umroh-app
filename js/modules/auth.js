// js/modules/auth.js

// Tunggu sampai seluruh elemen HTML (tombol, input) selesai dimuat di browser
document.addEventListener('DOMContentLoaded', () => {
    
    const btnLogin = document.getElementById('btnLogin');
    const formLogin = document.getElementById('formLogin');

    // Jika kita sedang berada di halaman login.html, tombol ini pasti ada
    if (btnLogin && formLogin) {
        btnLogin.addEventListener('click', (event) => {
            event.preventDefault(); // Cegah refresh halaman
            
            const alertBox = document.getElementById('loginAlert');
            const emailVal = document.getElementById('email').value;
            const passVal = document.getElementById('password').value;
            
            alertBox.innerHTML = '';
            btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memverifikasi...';
            btnLogin.disabled = true;

            // Eksekusi Login Firebase
            auth.signInWithEmailAndPassword(emailVal, passVal)
                .then((userCredential) => {
                    // Jika sukses, lempar admin ke halaman index.html (dashboard)
                    window.location.href = 'index.html?view=dashboard';
                })
                .catch((error) => {
                    const errorCode = error.code;
                    let errorMessage = "Terjadi kesalahan. Silakan coba lagi.";
                    
                    if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
                        errorMessage = "Email atau Password yang Anda masukkan salah.";
                    } else if (errorCode === 'auth/too-many-requests') {
                        errorMessage = "Terlalu banyak percobaan. Akun terkunci sementara.";
                    }

                    alertBox.innerHTML = `<div class="alert alert-danger py-2 text-center mb-0"><i class="bi bi-exclamation-triangle"></i> ${errorMessage}</div>`;
                    btnLogin.innerHTML = 'Masuk ke Dashboard <i class="bi bi-box-arrow-in-right ms-2"></i>';
                    btnLogin.disabled = false;
                });
        });
    }

    // Tombol Logout jika ada (di index.html)
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }
});

// Penjaga Sesi Keamanan (Global Observer)
auth.onAuthStateChanged((user) => {
    const isLoginPage = window.location.pathname.includes('login.html');
    
    if (user) {
        // Jika sudah login tapi iseng buka halaman login.html, tendang ke index.html
        if (isLoginPage) {
            window.location.href = 'index.html?view=dashboard';
        }
    } else {
        // Jika belum login, tapi sedang di dalam dashboard (index.html dengan parameter dashboard)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('view') === 'dashboard' && !isLoginPage) {
            window.location.href = 'login.html';
        }
    }
});