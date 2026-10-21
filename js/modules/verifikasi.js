// ==========================================
// FUNGSI MEMUAT DATA ANTREAN VERIFIKASI
// ==========================================
function loadAntreanVerifikasi() {
    // 1. Bersihkan DataTables jika sudah ada (mencegah error _DT_CellIndex)
    if ($.fn.DataTable.isDataTable('#tabel-verifikasi')) {
        $('#tabel-verifikasi').DataTable().clear().destroy();
    }

    const tbody = document.getElementById('tbody-verifikasi');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Memuat antrean verifikasi...</td></tr>';

    // 2. Ambil data dari Firebase (Koleksi Jemaah)
    db.collection("jemaah").orderBy("status", "desc").get().then((snapshot) => {
        let html = '';
        
        if (snapshot.empty) {
            html = '<tr><td colspan="4" class="text-center py-4">Belum ada antrean data jemaah.</td></tr>';
        } else {
            snapshot.forEach((doc) => {
                const jm = doc.data();
                jm.id = doc.id;

                // Tentukan warna badge mengikuti desain GAS Anda
                let badgeColor = 'bg-warning text-dark'; 
                let statusText = jm.status || 'Menunggu Verifikasi';
                
                if (statusText === 'Siap Berangkat' || statusText === 'Disetujui') {
                    badgeColor = 'bg-success';
                } else if (statusText === 'Ditolak' || statusText === 'Butuh Revisi') {
                    badgeColor = 'bg-danger';
                }

                // Encode data untuk dilempar ke fungsi Fullscreen Modal nanti
                const encodedData = encodeURIComponent(JSON.stringify(jm));

                // 3. Cetak Baris Tabel
                html += `
                <tr>
                    <td class="align-middle fw-bold text-primary">${jm.id}</td>
                    <td class="align-middle fw-bold">${jm.nama || '-'}</td>
                    <td class="align-middle">
                        <span class="badge ${badgeColor} px-3 py-2 rounded-pill">${statusText}</span>
                    </td>
                    <td class="align-middle text-end">
                        <button class="btn btn-dark btn-sm shadow-sm" onclick="bukaRuangVerifikasi('${encodedData}')">
                            <i class="bi bi-search me-1"></i> Review
                        </button>
                    </td>
                </tr>
                `;
            });
        }

        tbody.innerHTML = html;

        // 4. Bangkitkan kembali DataTables
        $('#tabel-verifikasi').DataTable({
            language: { 
                url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/id.json',
                emptyTable: "Belum ada antrean verifikasi."
            },
            pageLength: 10,
            destroy: true,
            // Tata letak standar tanpa tombol Excel (karena ini hanya halaman untuk mengecek/review)
            dom: '<"d-flex flex-wrap justify-content-between align-items-center mb-3"f>rt<"d-flex flex-wrap justify-content-between align-items-center mt-3"ip>'
        });

    }).catch((error) => {
        console.error("Gagal memuat antrean verifikasi:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger fw-bold py-4"><i class="bi bi-exclamation-triangle me-2"></i>Gagal memuat data: ${error.message}</td></tr>`;
    });
}

// ==========================================
// FUNGSI MEMBUKA RUANG KERJA (FULLSCREEN MODAL)
// ==========================================
function bukaRuangVerifikasi(encodedData) {
    // 1. Pecah data jemaah
    const data = JSON.parse(decodeURIComponent(encodedData));
    
    // 2. Isi form di sebelah kanan (Sesuai ID form di admin.html)
    document.getElementById('verif-id-jemaah').value = data.id;
    document.getElementById('verif-info-reg').innerText = `${data.id} (${data.paket || '-'})`;
    
    // Data Diri
    document.getElementById('verif-nama').value = data.nama || '';
    document.getElementById('verif-nik').value = data.nik || '';
    // PERBAIKAN: Gunakan data.wa (Sesuai field Firestore kita)
    document.getElementById('verif-hp').value = data.wa || ''; 
    document.getElementById('verif-alamat').value = data.alamat || '';
    
    // Data Mahram 
    // PERBAIKAN: Gunakan data.mahramNama dan data.mahramHub
    document.getElementById('verif-nama-mahram').value = data.mahramNama || '';
    document.getElementById('verif-hubungan-mahram').value = data.mahramHub || '';
    document.getElementById('verif-hp-mahram').value = data.daruratHp || ''; // Menggunakan no HP darurat
    
    // Data Paspor
    // PERBAIKAN: Gunakan data.pasporNo dan data.pasporTempat
    document.getElementById('verif-nama-paspor').value = data.nama || ''; // Default samakan dengan nama
    document.getElementById('verif-no-paspor').value = data.pasporNo || '';
    document.getElementById('verif-imigrasi').value = data.pasporTempat || '';
    
    // Set status default dropdown
    let statusPilihan = data.status;
    if (statusPilihan === 'Siap Berangkat') statusPilihan = 'Disetujui';
    const selectStatus = document.getElementById('verif-status');
    if (!Array.from(selectStatus.options).some(opt => opt.value === statusPilihan)) {
        statusPilihan = 'Menunggu Verifikasi';
    }
    selectStatus.value = statusPilihan;
    
    // 3. Bangkitkan Tombol & Tampilan Dokumen di Sisi Kiri
    siapkanViewerDokumen(data);

    // 4. Tampilkan Modal Layar Penuh
    const modalReview = new bootstrap.Modal(document.getElementById('modalRuangVerifikasi'));
    modalReview.show();
}

// ==========================================
// FUNGSI MENYIAPKAN VIEWER DOKUMEN
// ==========================================
function siapkanViewerDokumen(data) {
    const tabsContainer = document.getElementById('dokumen-tabs');
    const viewerContainer = document.getElementById('dokumen-viewer');
    
    tabsContainer.innerHTML = ''; 
    viewerContainer.innerHTML = '<h5 class="text-white">Memuat dokumen...</h5>';

    // PERBAIKAN: Selaraskan dengan field url Firebase yang benar, termasuk Foto
    const daftarDokumen = [
        { nama: 'Pas Foto', url: data.urlFoto, icon: 'bi-person-bounding-box' },
        { nama: 'KTP', url: data.urlKtp, icon: 'bi-person-vcard' },
        { nama: 'KK', url: data.urlKk, icon: 'bi-people' }, // Pastikan urlKK huruf besar
        { nama: 'Buku Nikah', url: data.urlNikah, icon: 'bi-book' }, 
        { nama: 'Paspor', url: data.urlPaspor, icon: 'bi-journal-text' }, 
        { nama: 'Akta Lahir', url: data.urlLahir, icon: 'bi-file-earmark-person' } 
    ];

    let dokumenTersedia = 0;

    daftarDokumen.forEach(dok => {
        if (dok.url && dok.url !== '') {
            dokumenTersedia++;
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-primary btn-sm fw-bold me-2 mb-2';
            btn.innerHTML = `<i class="bi ${dok.icon} me-1"></i>${dok.nama}`;
            btn.onclick = (e) => tampilkanGambar(dok.url, dok.nama, e.target);
            tabsContainer.appendChild(btn);
        }
    });

    if (dokumenTersedia > 0) {
        tabsContainer.firstChild.click(); // Otomatis buka dokumen pertama
    } else {
        viewerContainer.innerHTML = '<h5 class="text-white text-center"><i class="bi bi-x-circle d-block fs-1 mb-2"></i>Jemaah ini belum mengunggah dokumen apapun</h5>';
    }
}

// Variabel global untuk mencatat level zoom
let tingkatZoom = 100;


// ==========================================
// VARIABEL GLOBAL UNTUK ZOOM & PAN (GESER)
// ==========================================
window.viewerState = {
    scale: 1,
    isDragging: false,
    startX: 0,
    startY: 0,
    translateX: 0,
    translateY: 0
};


// ==========================================
// FUNGSI MENAMPILKAN GAMBAR (VERSI PRO: ZOOM & DRAG)
// ==========================================
function tampilkanGambar(url, namaDokumen, tombolAktif) {
    // 1. Reset state (kondisi) zoom & pan setiap kali pindah dokumen
    window.viewerState = { scale: 1, isDragging: false, startX: 0, startY: 0, translateX: 0, translateY: 0 };

    // 2. Tandai tombol tab dokumen yang aktif
    const semuaTombol = document.getElementById('dokumen-tabs').querySelectorAll('button');
    semuaTombol.forEach(btn => btn.classList.remove('active'));
    const tombol = tombolAktif.closest('button');
    if(tombol) tombol.classList.add('active');

    // 3. Atur wadah utama (Viewer) agar ukurannya terkunci dan menahan gambar yang keluar batas
    const viewer = document.getElementById('dokumen-viewer');
    viewer.style.position = 'relative'; 
    viewer.style.overflow = 'hidden'; // Cegah scrollbar bawaan muncul
    viewer.style.padding = '0';

    viewer.innerHTML = `
        <!-- Gambar yang bisa digeser dan di-zoom -->
        <img src="${url}" alt="Dokumen ${namaDokumen}" id="gambar-dokumen" class="bg-white shadow" 
             style="max-height: 85vh; max-width: 100%; cursor: grab; transform-origin: center center; transition: transform 0.2s ease-out;">
        
        <!-- Tombol Buka di Tab Baru (Kanan Atas) -->
        <a href="${url}" target="_blank" class="btn btn-dark btn-sm position-absolute top-0 end-0 m-3 shadow border border-secondary" style="z-index: 10;" title="Buka gambar di tab baru">
            <i class="bi bi-box-arrow-up-right"></i>
        </a>

        <!-- Panel Zoom (Bawah Tengah, Posisi Terkunci) -->
        <div class="position-absolute bottom-0 start-50 translate-middle-x mb-4 bg-dark bg-opacity-75 rounded-pill px-4 py-2 shadow border border-secondary d-flex gap-4 align-items-center" style="z-index: 10;">
            <button class="btn btn-sm text-white p-0 fs-5" onclick="aturZoom(-0.2)" title="Perkecil"><i class="bi bi-dash"></i></button>
            <button class="btn btn-sm text-white p-0 fs-6" onclick="aturZoom(0)" title="Kembali Normal"><i class="bi bi-search"></i></button>
            <button class="btn btn-sm text-white p-0 fs-5" onclick="aturZoom(0.2)" title="Perbesar"><i class="bi bi-plus"></i></button>
        </div>
    `;

    const img = document.getElementById('gambar-dokumen');

    // 4. EVENT LISTENER: Zoom dengan Scroll (Tanpa CTRL)
    viewer.onwheel = function(e) {
        e.preventDefault(); // Mencegah halaman ikut ter-scroll
        const delta = e.deltaY < 0 ? 0.15 : -0.15; // Scroll atas = zoom in, bawah = zoom out
        aturZoom(delta);
    };

    // 5. EVENT LISTENER: Mulai Geser (Klik Tahan)
    viewer.onmousedown = function(e) {
        e.preventDefault(); // Mencegah perilaku "ghost image" bawaan browser saat meng-drag gambar
        window.viewerState.isDragging = true;
        // Catat posisi klik awal dikurangi nilai pergeseran saat ini
        window.viewerState.startX = e.clientX - window.viewerState.translateX;
        window.viewerState.startY = e.clientY - window.viewerState.translateY;
        
        img.style.cursor = 'grabbing';
        img.style.transition = 'none'; // Matikan animasi sementara agar saat digeser terasa instan (tidak delay)
    };

    // 6. EVENT LISTENER: Sedang Menggeser (Mouse Bergerak)
    viewer.onmousemove = function(e) {
        if (!window.viewerState.isDragging) return;
        
        window.viewerState.translateX = e.clientX - window.viewerState.startX;
        window.viewerState.translateY = e.clientY - window.viewerState.startY;
        
        // Terapkan perubahan ke gambar
        img.style.transform = `translate(${window.viewerState.translateX}px, ${window.viewerState.translateY}px) scale(${window.viewerState.scale})`;
    };

    // 7. EVENT LISTENER: Lepas Geseran
    const hentikanGeser = function() {
        if (window.viewerState.isDragging) {
            window.viewerState.isDragging = false;
            img.style.cursor = 'grab';
            img.style.transition = 'transform 0.2s ease-out'; // Hidupkan kembali animasi untuk zoom
        }
    };
    viewer.onmouseup = hentikanGeser;
    viewer.onmouseleave = hentikanGeser; // Tetap berhenti geser meski kursor keluar dari kotak hitam
}

// ==========================================
// FUNGSI EKSEKUTOR ZOOM (Dengan Skala Transform)
// ==========================================
window.aturZoom = function(nilaiTambah) {
    const img = document.getElementById('gambar-dokumen');
    if (!img) return;

    if (nilaiTambah === 0) {
        // Reset ke normal
        window.viewerState.scale = 1;
        window.viewerState.translateX = 0;
        window.viewerState.translateY = 0;
    } else {
        // Hitung skala baru
        window.viewerState.scale += nilaiTambah;
        
        // Batasi batas perbesaran maksimal dan minimal
        if (window.viewerState.scale > 4) window.viewerState.scale = 4; // Maksimal zoom 4x
        if (window.viewerState.scale < 0.5) window.viewerState.scale = 0.5; // Minimal zoom 0.5x
    }

    // Terapkan perubahan ke gambar
    img.style.transform = `translate(${window.viewerState.translateX}px, ${window.viewerState.translateY}px) scale(${window.viewerState.scale})`;
};

// ==========================================
// FUNGSI SIMPAN KEPUTUSAN (Firebase Update)
// ==========================================
function simpanKeputusan() {
    // 1. Tangkap data utama & keputusan
    const idJemaah = document.getElementById('verif-id-jemaah').value;
    const statusPilihan = document.getElementById('verif-status').value;
    const catatan = document.getElementById('verif-catatan').value;
    
    // 2. Tangkap isian Data Diri
    const namaBaru = document.getElementById('verif-nama').value;
    const nikBaru = document.getElementById('verif-nik').value;
    const hpBaru = document.getElementById('verif-hp').value;
    const alamatBaru = document.getElementById('verif-alamat').value;

    // 3. Tangkap isian Data Mahram
    const namaMahramBaru = document.getElementById('verif-nama-mahram').value;
    const hubunganMahramBaru = document.getElementById('verif-hubungan-mahram').value;
    const hpMahramBaru = document.getElementById('verif-hp-mahram').value;

    // 4. Tangkap isian Data Paspor
    const namaPasporBaru = document.getElementById('verif-nama-paspor').value;
    const noPasporBaru = document.getElementById('verif-no-paspor').value;
    const imigrasiBaru = document.getElementById('verif-imigrasi').value;

    // Validasi: Jika ditolak, catatan WAJIB diisi
    if (statusPilihan === 'Ditolak' && catatan.trim() === '') {
        Swal.fire({
            icon: 'warning',
            title: 'Catatan Kosong!',
            text: 'Jika status Ditolak (Butuh Revisi), Anda wajib mengisi catatan.'
        });
        return;
    }

    Swal.fire({
        title: 'Menyimpan Keputusan...',
        text: 'Sedang memperbarui data ke server.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Konversi status
    let statusFinal = statusPilihan;
    if (statusFinal === 'Disetujui') statusFinal = 'Siap Berangkat';
    else if (statusFinal === 'Ditolak') statusFinal = 'Butuh Revisi';

    // 5. Eksekusi Update ke Firebase Firestore
    // PERBAIKAN: Gunakan key field yang benar saat menyimpan kembali ke database
    db.collection("jemaah").doc(idJemaah).update({
        nama: namaBaru,
        nik: nikBaru,
        wa: hpBaru, // Disimpan kembali sebagai wa
        alamat: alamatBaru,
        mahramNama: namaMahramBaru, // Disimpan kembali sebagai mahramNama
        mahramHub: hubunganMahramBaru, 
        daruratHp: hpMahramBaru, 
        pasporNo: noPasporBaru, // Disimpan kembali sebagai pasporNo
        pasporTempat: imigrasiBaru, // Disimpan kembali sebagai pasporTempat
        status: statusFinal,
        catatan_verifikasi: catatan
    }).then(() => {
        // Tutup modal
        const modalEl = document.getElementById('modalRuangVerifikasi');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        // Tampilkan sukses & refresh
        Swal.fire({
            icon: 'success',
            title: 'Data Disimpan!',
            text: `Data jemaah telah diperbarui menjadi: ${statusFinal}`,
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            loadAntreanVerifikasi(); 
            // Opsional: Refresh tabel jemaah utama jika ada
            if(typeof loadDataJemaah === 'function') loadDataJemaah();
        });

    }).catch((error) => {
        console.error("Gagal update data:", error);
        Swal.fire('Terjadi Kesalahan', 'Gagal menyimpan data: ' + error.message, 'error');
    });
}