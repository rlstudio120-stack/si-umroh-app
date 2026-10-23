// js/app.js

let currentUser = null;

/**
 * Fungsi untuk berpindah halaman utama (Aman dari error null)
 */
function tampilkanHalaman(viewId) {
    // Cari elemen-elemennya terlebih dahulu
    const viewPublic = document.getElementById('view-public');
    const viewLogin = document.getElementById('view-login');
    const viewMain = document.getElementById('view-main');

    // Hanya ubah style.display JIKA elemennya memang benar-benar ada di HTML
    if (viewPublic) viewPublic.style.display = 'none';
    if (viewLogin) viewLogin.style.display = 'none';
    if (viewMain) viewMain.style.display = 'none';
    
    // Tampilkan elemen target yang diminta
    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block';
}

/**
 * Fungsi untuk berpindah sub-menu di dalam Panel Admin
 */
// ==========================================
// FUNGSI NAVIGASI HALAMAN (SPA)
// ==========================================
function switchView(viewId) {
    // 1. Sembunyikan semua halaman yang memiliki class 'view-section'
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // 2. Tampilkan halaman yang dituju
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.style.display = 'block';
    }

    // 3. Muat data sesuai dengan halaman yang dibuka
    if (viewId === 'paket') {
        loadDataPaket();
    } else if (viewId === 'jemaah') {
        loadDataJemaah();
    } else if (viewId === 'dashboard') {
        loadDashboardData();
    } else if (viewId === 'dokumen') {
        loadAntreanVerifikasi();
    } else if (viewId === 'users') {
        // Panggil fungsi penarik data user (akan kita buat setelah ini)
        if (typeof loadDataUsers === 'function') loadDataUsers();
    }
}

/**
 * Fungsi Custom Alert menggunakan SweetAlert2
 * type bisa berisi: 'success', 'error', 'warning', 'info', 'question'
 */
function showCustomAlert(message, type = 'info', title = 'Informasi') {
    Swal.fire({
        title: title,
        html: message.replace(/\n/g, '<br>'), // Mengizinkan enter/baris baru
        icon: type,
        confirmButtonColor: '#FDB714', // Warna oranye/kuning khas Enka Imron
        confirmButtonText: 'OK, Mengerti',
        customClass: {
            confirmButton: 'btn btn-warning fw-bold text-dark px-4 shadow-sm'
        },
        buttonsStyling: false // Mematikan style bawaan agar menggunakan Bootstrap kita
    });
}

/**
 * Fungsi Konfirmasi Modern (Ya/Tidak) menggunakan SweetAlert2
 */
function showCustomConfirm(message, callback, title = 'Konfirmasi') {
    Swal.fire({
        title: title,
        html: message.replace(/\n/g, '<br>'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Lanjutkan!',
        cancelButtonText: 'Batal',
        customClass: {
            confirmButton: 'btn btn-danger fw-bold px-4 me-2 shadow-sm',
            cancelButton: 'btn btn-secondary px-4 shadow-sm'
        },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            callback(); // Eksekusi fungsi jika user menekan "Ya"
        }
    });
}

// Paksa aplikasi untuk langsung membuka Dashboard saat admin.html dimuat
document.addEventListener("DOMContentLoaded", () => {
    switchView('dashboard');
});