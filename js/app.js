// js/app.js

let currentUser = null;

// Saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Mengecek apakah ada instruksi khusus di URL (seperti index.html?view=dashboard)
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');

    // Jika URL meminta dashboard, langsung tampilkan Panel Admin
    if (viewParam === 'dashboard') {
        tampilkanHalaman('view-main');
        switchView('dashboard');
    } else {
        // Jika tidak, tampilkan halaman beranda publik
        tampilkanHalaman('view-public');
    }
});

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
function switchView(viewName) {
    // 1. Atur warna menu aktif di Sidebar
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Cari menu yang di-klik, jika ada beri class active
    const activeLink = document.querySelector(`.sidebar .nav-link[onclick="switchView('${viewName}')"]`);
    if(activeLink) activeLink.classList.add('active');

    // 2. Sembunyikan semua konten sub-halaman
    const subViews = document.querySelectorAll('.sub-view');
    subViews.forEach(view => {
        view.style.display = 'none';
    });
    
    // 3. Tampilkan sub-halaman yang dituju
    const activeView = document.getElementById('subview-' + viewName);
    if(activeView) {
        activeView.style.display = 'block';
    }

    // ====================================================================
    // 4. PEMICU (TRIGGER) UNTUK MEMUAT DATA OTOMATIS SAAT MENU DIKLIK
    // Bagian ini yang sebelumnya hilang dari file Anda
    // ====================================================================
    if (viewName === 'paket') {
        if (typeof loadDataPaket === 'function') loadDataPaket();
    } else if (viewName === 'jemaah') {
        if (typeof loadDataJemaah === 'function') loadDataJemaah();
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