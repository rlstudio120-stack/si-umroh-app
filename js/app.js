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
}

/**
 * Fungsi Custom Alert (Pop-up modern pengganti alert biasa)
 */
function showCustomAlert(message, type = 'info', title = 'Informasi') {
    const alertModalEl = document.getElementById('customAlertModal');
    if (!alertModalEl) {
        alert(message); // Fallback jika modal belum ada di halaman
        return;
    }

    const alertModal = new bootstrap.Modal(alertModalEl);
    
    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertMessage').innerHTML = message.replace(/\n/g, '<br>');
    
    const iconEl = document.getElementById('customAlertIcon');
    let iconHtml = '';
    
    if (type === 'success') {
      iconHtml = '<i class="bi bi-check-circle-fill text-success" style="font-size: 3.5rem;"></i>';
    } else if (type === 'error' || type === 'danger') {
      iconHtml = '<i class="bi bi-x-circle-fill text-danger" style="font-size: 3.5rem;"></i>';
    } else if (type === 'warning') {
      iconHtml = '<i class="bi bi-exclamation-triangle-fill text-warning" style="font-size: 3.5rem;"></i>';
    } else {
      iconHtml = '<i class="bi bi-info-circle-fill text-primary" style="font-size: 3.5rem;"></i>';
    }
    
    iconEl.innerHTML = iconHtml;
    alertModal.show();
}