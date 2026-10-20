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
                    // PERUBAHAN 1: Jika sukses, lempar ke halaman admin.html
                    window.location.href = 'admin.html';
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

    // Fungsi Logout Global (Bisa dipanggil dari mana saja)
    window.logoutAdmin = function(event) {
        if(event) event.preventDefault(); // Mencegah layar lompat ke atas saat link diklik
        
        // Konfirmasi sebelum keluar menggunakan SweetAlert (Opsional tapi keren)
        Swal.fire({
            title: 'Yakin ingin keluar?',
            text: "Anda akan mengakhiri sesi admin saat ini.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Keluar!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                auth.signOut().then(() => {
                    window.location.href = 'login.html';
                }).catch((error) => {
                    Swal.fire('Error', 'Gagal logout: ' + error.message, 'error');
                });
            }
        });
    };
});

// Penjaga Sesi Keamanan (Global Observer)
auth.onAuthStateChanged((user) => {
    const isLoginPage = window.location.pathname.includes('login.html');
    const isAdminPage = window.location.pathname.includes('admin.html');
    
    if (user) {
        // PERUBAHAN 3: Jika sudah login tapi iseng buka login.html, tendang ke admin.html
        if (isLoginPage) {
            window.location.href = 'admin.html';
        }
    } else {
        // PERUBAHAN 4: Jika BELUM login, tapi mencoba menyusup ke admin.html, tendang ke login.html
        if (isAdminPage) {
            window.location.href = 'login.html';
        }
    }
});