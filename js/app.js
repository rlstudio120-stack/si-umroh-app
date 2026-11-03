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

// ==========================================
// FUNGSI PENGATURAN KONTAK WA ADMIN
// ==========================================
function bukaModalSettingKontak() {
    db.collection("settings").doc("kontak").get().then((doc) => {
        if (doc.exists) {
            document.getElementById('set-wa-admin').value = doc.data().waAdmin || '';
        } else {
            document.getElementById('set-wa-admin').value = '';
        }
        new bootstrap.Modal(document.getElementById('modalSettingKontak')).show();
    });
}

function simpanSettingKontak(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>...';
    btn.disabled = true;

    const waAdmin = document.getElementById('set-wa-admin').value;

    db.collection("settings").doc("kontak").set({
        waAdmin: waAdmin,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        Swal.fire('Berhasil', 'Nomor WA Admin berhasil diperbarui!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalSettingKontak')).hide();
    }).catch((error) => {
        Swal.fire('Gagal', error.message, 'error');
    }).finally(() => {
        btn.innerHTML = '<i class="bi bi-save me-1"></i> Simpan';
        btn.disabled = false;
    });
}


// ==========================================
// MODUL PENGATURAN GLOBAL (KOP SURAT & NOMOR)
// ==========================================

// Variabel global agar bisa diakses oleh surat.js dan jemaah.js
window.konfigurasiSurat = {
    nama: { text: 'PT. ENKA IMRON MANDIRI', color: '#000000', size: 24, font: 'Arial, sans-serif', bold: true, italic: false, underline: false },
    sub: { text: 'Penyelenggara Perjalanan Ibadah Umroh & Haji Khusus', color: '#000000', size: 11, font: 'Arial, sans-serif', bold: false, italic: false, underline: false },
    alamat: { text: 'Jl. Veteran Gg. VI No. 7 Pamekasan Madura', color: '#000000', size: 10, font: 'Arial, sans-serif', bold: false, italic: false, underline: false },
    logoKiri: '', logoKanan: '', watermark: '', ttd: '',
    noSR: 0, noSK: 0, noKWT: 0, tahunSurat: new Date().getFullYear()
};

// Tarik data saat aplikasi pertama kali dimuat
document.addEventListener("DOMContentLoaded", () => {
    db.collection("settings").doc("kop_surat").get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (typeof data.nama === 'string') {
                window.konfigurasiSurat.nama.text = data.nama || '';
                window.konfigurasiSurat.sub.text = data.sub || '';
                window.konfigurasiSurat.alamat.text = data.alamat || '';
            } else {
                window.konfigurasiSurat.nama = { ...window.konfigurasiSurat.nama, ...data.nama };
                window.konfigurasiSurat.sub = { ...window.konfigurasiSurat.sub, ...data.sub };
                window.konfigurasiSurat.alamat = { ...window.konfigurasiSurat.alamat, ...data.alamat };
            }
            window.konfigurasiSurat.logoKiri = data.logoKiri || '';
            window.konfigurasiSurat.logoKanan = data.logoKanan || '';
            window.konfigurasiSurat.watermark = data.watermark || '';
            window.konfigurasiSurat.ttd = data.ttd || '';
            window.konfigurasiSurat.noSR = parseInt(data.noSR) || 0;
            window.konfigurasiSurat.noSK = parseInt(data.noSK) || 0;
            window.konfigurasiSurat.noKWT = parseInt(data.noKWT) || 0;
            window.konfigurasiSurat.tahunSurat = parseInt(data.tahunSurat) || new Date().getFullYear();
        }
    });
});

// Fungsi pembantu form
function isiFormFormat(idPrefix, objData) {
    document.getElementById(`${idPrefix}`).value = objData.text;
    document.getElementById(`${idPrefix}-color`).value = objData.color;
    document.getElementById(`${idPrefix}-size`).value = objData.size;
    document.getElementById(`${idPrefix}-font`).value = objData.font;
    document.getElementById(`${idPrefix}-b`).checked = objData.bold;
    document.getElementById(`${idPrefix}-i`).checked = objData.italic;
    document.getElementById(`${idPrefix}-u`).checked = objData.underline;
}

function tarikDataFormat(idPrefix) {
    return {
        text: document.getElementById(`${idPrefix}`).value,
        color: document.getElementById(`${idPrefix}-color`).value,
        size: document.getElementById(`${idPrefix}-size`).value,
        font: document.getElementById(`${idPrefix}-font`).value,
        bold: document.getElementById(`${idPrefix}-b`).checked,
        italic: document.getElementById(`${idPrefix}-i`).checked,
        underline: document.getElementById(`${idPrefix}-u`).checked
    };
}

// Buka Modal Pengaturan dari Menu Sidebar
function bukaModalSettingSurat() {
    isiFormFormat('set-kop-nama', window.konfigurasiSurat.nama);
    isiFormFormat('set-kop-sub', window.konfigurasiSurat.sub);
    isiFormFormat('set-kop-alamat', window.konfigurasiSurat.alamat);
    
    document.getElementById('set-no-sr').value = window.konfigurasiSurat.noSR;
    document.getElementById('set-no-sk').value = window.konfigurasiSurat.noSK;
    document.getElementById('set-no-kwt').value = window.konfigurasiSurat.noKWT;
    
    const showPreview = (id, url) => {
        const img = document.getElementById(id);
        if (img) {
            if (url) { img.src = url; img.classList.remove('d-none'); } 
            else { img.classList.add('d-none'); }
        }
    };
    showPreview('preview-logo-kiri', window.konfigurasiSurat.logoKiri);
    showPreview('preview-logo-kanan', window.konfigurasiSurat.logoKanan);
    showPreview('preview-logo-watermark', window.konfigurasiSurat.watermark);
    showPreview('preview-ttd', window.konfigurasiSurat.ttd);

    new bootstrap.Modal(document.getElementById('modalSettingSurat')).show();
}

// Simpan Pengaturan Kop Surat ke Firestore
async function simpanSettingSurat(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSimpanSettingSurat');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';
    btn.disabled = true;

    try {
        const up = async (id, lama) => { const f = document.getElementById(id).files[0]; return f ? await uploadKeCloudinary(f) : lama; };
        
        const payload = {
            nama: tarikDataFormat('set-kop-nama'),
            sub: tarikDataFormat('set-kop-sub'),
            alamat: tarikDataFormat('set-kop-alamat'),
            logoKiri: await up('set-file-kiri', window.konfigurasiSurat.logoKiri),
            logoKanan: await up('set-file-kanan', window.konfigurasiSurat.logoKanan),
            watermark: await up('set-file-watermark', window.konfigurasiSurat.watermark),
            ttd: await up('set-file-ttd', window.konfigurasiSurat.ttd),
            noSR: parseInt(document.getElementById('set-no-sr').value) || 0,
            noSK: parseInt(document.getElementById('set-no-sk').value) || 0,
            noKWT: parseInt(document.getElementById('set-no-kwt').value) || 0,
            tahunSurat: window.konfigurasiSurat.tahunSurat,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("settings").doc("kop_surat").set(payload);
        window.konfigurasiSurat = payload; // Update memori lokal
        
        Swal.fire('Berhasil', 'Pengaturan Kop Surat, TTD, & Penomoran diperbarui!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalSettingSurat')).hide();
    } catch (error) {
        Swal.fire('Gagal', error.message, 'error');
    } finally {
        btn.innerHTML = '<i class="bi bi-save me-1"></i> Simpan Pengaturan';
        btn.disabled = false;
    }
}