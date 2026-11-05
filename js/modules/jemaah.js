// ==========================================
// MEMUAT FILTER & DATA JEMAAH KE TABEL
// ==========================================
let isFilterJemaahLoaded = false;

async function loadDataJemaah() {
    // 1. Muat Filter secara Async agar bisa mendeteksi paket terbaru
    if (!isFilterJemaahLoaded) {
        const selTahun = document.getElementById('filter-jemaah-tahun');
        const thnSekarang = new Date().getFullYear();
        let opsiTahun = `<option value="Semua">Semua Tahun</option>`;
        for (let t = thnSekarang + 1; t >= thnSekarang - 3; t--) {
            opsiTahun += `<option value="${t}" ${t === thnSekarang ? 'selected' : ''}>${t}</option>`;
        }
        if (selTahun) selTahun.innerHTML = opsiTahun;

        const selPaket = document.getElementById('filter-jemaah-paket');
        const snapshot = await db.collection("paket").where("status", "==", "Aktif").get();
        let opsiPaket = '<option value="Semua">Semua Paket Aktif</option>';
        let arrPaket = [];
        snapshot.forEach(doc => arrPaket.push(doc.data()));
        
        // Urutkan paket dari yang terbaru (berdasarkan waktu dibuat)
        arrPaket.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        arrPaket.forEach(p => { opsiPaket += `<option value="${p.nama}">${p.nama}</option>`; });
        
        if (selPaket) {
            selPaket.innerHTML = opsiPaket;
            if (arrPaket.length > 0) selPaket.value = arrPaket[0].nama; // Pilih paket terbaru otomatis
        }
        isFilterJemaahLoaded = true;
    }

    if ($.fn.DataTable.isDataTable('#tabel-jemaah')) {
        $('#tabel-jemaah').DataTable().clear().destroy();
    }

    const tbody = document.querySelector('#tabel-jemaah tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Memuat data...</td></tr>';

    const valTahun = document.getElementById('filter-jemaah-tahun') ? document.getElementById('filter-jemaah-tahun').value : new Date().getFullYear().toString();
    const valPaket = document.getElementById('filter-jemaah-paket') ? document.getElementById('filter-jemaah-paket').value : 'Semua';

    db.collection("jemaah").orderBy("createdAt", "desc").get().then((snapshot) => {
        let html = '';
        
        if (!snapshot.empty) {
            snapshot.forEach((doc) => {
                const jm = doc.data(); jm.id = doc.id; 
                
                let passTahun = true;
                if (valTahun !== 'Semua') {
                    let thnJemaah = jm.createdAt?.seconds ? new Date(jm.createdAt.seconds * 1000).getFullYear().toString() : '-';
                    if (thnJemaah !== valTahun) passTahun = false;
                }
                let passPaket = true;
                if (valPaket !== 'Semua' && jm.paket !== valPaket) passPaket = false;

                if (passTahun && passPaket) {
                    let badgeColor = jm.status === 'Menunggu Verifikasi' ? 'bg-warning text-dark' : (jm.status === 'Siap Berangkat' ? 'bg-success' : 'bg-secondary');
                    html += `
                    <tr>
                        <td class="align-middle fw-bold d-none d-md-table-cell">${jm.id}</td>
                        <td class="align-middle">${jm.nama || '-'}</td>
                        <td class="align-middle d-none d-md-table-cell">${jm.paket || '-'}</td>
                        <td class="align-middle"><span class="badge ${badgeColor} px-2 py-1">${jm.status || '-'}</span></td>
                        <td class="align-middle whitespace-nowrap">
                            <button class="btn btn-primary btn-sm me-1 shadow-sm" onclick="lihatDetailJemaah('${encodeURIComponent(JSON.stringify(jm))}')"><i class="bi bi-search"></i></button>
                            <button class="btn btn-danger btn-sm shadow-sm" onclick="hapusJemaah('${jm.id}')"><i class="bi bi-trash"></i></button>
                        </td>
                    </tr>`;
                }
            });
        }

        tbody.innerHTML = html;

        // Inisialisasi Ulang DataTables
        $('#tabel-jemaah').DataTable({
            language: { 
                url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/id.json', 
                emptyTable: "Belum ada data jemaah." 
            },
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Semua"]],
            pageLength: 10,
            
            // Menggunakan flex-wrap agar elemen tetap seukuran aslinya dan tidak memanjang
            dom: '<"d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3"<"d-flex flex-wrap align-items-center gap-3"lB>f>rt<"d-flex flex-wrap justify-content-between align-items-center mt-3"ip>',
            
            buttons: [
                {
                    // PERBAIKAN: Menghapus extend excelHtml5 dan menggantinya dengan action kustom
                    text: '<i class="bi bi-file-earmark-excel me-1"></i> Export Data Lengkap',
                    className: 'btn btn-success btn-sm fw-bold shadow-sm',
                    action: function (e, dt, node, config) {
                        bukaModalExport(); // Memanggil pop-up opsi paket
                    }
                }
            ]
        });
    }).catch((error) => {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Gagal memuat: ${error.message}</td></tr>`;
    });
}

// ==========================================
// FUNGSI UNTUK MEMBUKA MODAL DETAIL
// ==========================================
function lihatDetailJemaah(encodedJSON) {
    const jm = JSON.parse(decodeURIComponent(encodedJSON));
    
    // --- KOLOM KIRI (PROFIL SINGKAT) ---
    document.getElementById('detFoto').src = jm.urlFoto || 'https://via.placeholder.com/150?text=Tanpa+Foto';

    // TAMBAHAN: Logika memunculkan tombol Download Pas Foto
    const btnDownloadFoto = document.getElementById('btnDownloadFoto');
    if (btnDownloadFoto) {
        if (jm.urlFoto && jm.urlFoto !== "") {
            btnDownloadFoto.classList.remove('d-none'); // Munculkan tombol
            btnDownloadFoto.onclick = () => unduhBerkasSatuan(jm.urlFoto, `Pas Foto - ${jm.nama}`);
        } else {
            btnDownloadFoto.classList.add('d-none'); // Sembunyikan jika tidak ada foto
        }
    }

    document.getElementById('detNamaSingkat').innerText = jm.nama || '-';
    document.getElementById('detNoReg').innerText = jm.id;
    document.getElementById('detPaketPilihan').innerText = jm.paket || '-';
    
    let tglDaftar = '-';
    if (jm.createdAt && jm.createdAt.seconds) {
        tglDaftar = new Date(jm.createdAt.seconds * 1000).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'});
    }
    document.getElementById('detTglDaftar').innerText = tglDaftar;

    let badgeColor = 'bg-secondary';
    if (jm.status === 'Menunggu Verifikasi') badgeColor = 'bg-success'; 
    else if (jm.status === 'Siap Berangkat') badgeColor = 'bg-primary';
    document.getElementById('detStatusBadge').innerHTML = `<span class="badge ${badgeColor} w-100 py-2">${jm.status || '-'}</span>`;

    // --- KOLOM KIRI (STATUS FISIK BERKAS) ---
    const setBerkas = (url, badgeId, btnId, namaBerkas) => {
        const badge = document.getElementById(badgeId);
        const btn = document.getElementById(btnId);
        if (!badge || !btn) return;
        
        if (url && url !== "") {
            // PERBAIKAN: Ubah menjadi tombol Download yang memanggil fungsi unduhBerkasSatuan
            badge.innerHTML = `<button type="button" class="btn btn-success btn-sm shadow-sm py-0 px-2" onclick="unduhBerkasSatuan('${url}', '${namaBerkas} - ${jm.nama}')">Download</button>`;
            
            btn.className = "btn btn-info btn-sm py-0 px-2 shadow-sm text-white";
            btn.innerHTML = "Update";
        } else {
            badge.innerHTML = '<span class="badge bg-danger btn-sm px-2 py-1">Belum Ada</span>';
            btn.className = "btn btn-primary btn-sm py-0 px-2 shadow-sm";
            btn.innerHTML = "Upload";
        }
    };
    
    // Perhatikan tambahan parameter ke-4 (Nama Berkas) untuk penamaan file otomatis
    setBerkas(jm.urlKtp, 'badgeKtp', 'btnUpdKtp', 'KTP');
    setBerkas(jm.urlKk || jm.urlKK, 'badgeKk', 'btnUpdKk', 'KK'); 
    setBerkas(jm.urlNikah, 'badgeNikah', 'btnUpdNikah', 'Buku Nikah');
    setBerkas(jm.urlPaspor, 'badgePaspor', 'btnUpdPaspor', 'Paspor');
    setBerkas(jm.urlLahir, 'badgeLahir', 'btnUpdLahir', 'Akte Lahir');
    setBerkas(jm.urlVaksin, 'badgeVaksin', 'btnUpdVaksin', 'Vaksin');

    // --- KOLOM KANAN (INFORMASI PRIBADI) ---
    document.getElementById('detNikKtp').innerText = jm.nik || '-';
    
    let tempatTglLahir = (jm.tempatLahir || '-') + ', ' + (jm.tglLahir ? new Date(jm.tglLahir).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'}) : '-');
    document.getElementById('detTempatTglLahir').innerText = tempatTglLahir;
    
    document.getElementById('detJk').innerText = jm.jk || '-';
    
    let alamatLengkap = (jm.alamat || '-') + ', ' + (jm.kota || '-') + ' - ' + (jm.provinsi || '-');
    document.getElementById('detAlamat').innerText = alamatLengkap;
    
    // Format WA Dinamis
    if (jm.wa && jm.wa !== '-') {
        let noWa = jm.wa.toString().replace(/\D/g, ''); // Bersihkan karakter non-angka
        if (noWa.startsWith('0')) noWa = '62' + noWa.substring(1); // Ubah awalan 0 jadi 62
        
        document.getElementById('detNoHp').innerHTML = `
            <div class="d-flex align-items-center">
                <span class="me-2 fw-bold">${jm.wa}</span>
                <a href="https://wa.me/${noWa}" target="_blank" class="btn btn-success btn-sm py-0 px-2 shadow-sm rounded-pill" style="font-size: 0.75rem;">
                    <i class="bi bi-whatsapp me-1"></i>Chat
                </a>
            </div>
        `;
    } else {
        document.getElementById('detNoHp').innerText = '-';
    }

    document.getElementById('detEmail').innerText = jm.email || '-';

    // --- KOLOM KANAN (KEIMIGRASIAN & MAHRAM) ---
    document.getElementById('detNoPaspor').innerText = jm.pasporNo || '-';
    document.getElementById('detTempatTerbit').innerText = jm.pasporTempat || '-';
    
    let masaBerlaku = '-';
    if (jm.pasporTgl && jm.pasporExp) {
        let terbit = new Date(jm.pasporTgl).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
        let exp = new Date(jm.pasporExp).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
        masaBerlaku = `${terbit} s.d ${exp}`;
    }
    document.getElementById('detMasaBerlaku').innerText = masaBerlaku;
    
    let infoMahram = '-';
    if (jm.mahramNama) infoMahram = `${jm.mahramNama} (${jm.mahramHub || '-'})`;
    document.getElementById('detMahram').innerText = infoMahram;

    // --- KOLOM KANAN (KONTAK DARURAT) ---
    document.getElementById('detDaruratNama').innerText = jm.daruratNama || '-';
    document.getElementById('detDaruratHubHp').innerText = (jm.daruratHub || '-') + ' / ' + (jm.daruratHp || '-');

    const btnEdit = document.getElementById('btnEditDariDetail');
    btnEdit.onclick = function() {
        bootstrap.Modal.getInstance(document.getElementById('modalDetailJemaah')).hide();
        bukaModalEditJemaah(encodedJSON);
    };

    const btnCetak = document.getElementById('btnCetakBukti');
    btnCetak.onclick = function() {
        cetakBuktiPendaftaran(jm);
    };

    // TAMBAHAN: Tautkan data jemaah yang aktif ke tombol Backup
    const btnBackup = document.getElementById('btnBackupJemaah');
    if(btnBackup) {
        btnBackup.onclick = function() {
            prosesBackupJemaah(jm);
        };
    }

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailJemaah'));

    modal.show();
}

// ==========================================
// FUNGSI PENDAFTARAN & HAPUS
// ==========================================
function bukaModalTambahJemaah() {
    document.getElementById('formTambahJemaah').reset();
    
    const selectPaket = document.getElementById('inputPaket');
    if (selectPaket) {
        selectPaket.innerHTML = '<option value="">-- Memuat Paket... --</option>';
        db.collection("paket").where("status", "==", "Aktif").get().then((snapshot) => {
            let options = '<option value="">-- Pilih Paket Umroh --</option>';
            snapshot.forEach(doc => {
                options += `<option value="${doc.data().nama}">${doc.data().nama} (${doc.data().durasi} Hari)</option>`;
            });
            selectPaket.innerHTML = options;
        });
    }

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalJemaah'));
    modal.show();
}

async function submitJemaah(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSimpanJemaah');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan & Upload Berkas...';
    btn.disabled = true;

    try {
        let uploadPromises = [];
        
        const fKtp = document.getElementById('fileKtp').files[0];
        const fKk = document.getElementById('fileKk').files[0];
        const fNikah = document.getElementById('fileNikah').files[0];
        const fLahir = document.getElementById('fileLahir').files[0];
        const fFoto = document.getElementById('fileFoto').files[0];
        const fPaspor = document.getElementById('filePaspor').files[0];

        let urlKtp = fKtp ? uploadKeCloudinary(fKtp) : Promise.resolve("");
        let urlKk = fKk ? uploadKeCloudinary(fKk) : Promise.resolve("");
        let urlNikah = fNikah ? uploadKeCloudinary(fNikah) : Promise.resolve("");
        let urlLahir = fLahir ? uploadKeCloudinary(fLahir) : Promise.resolve("");
        let urlFoto = fFoto ? uploadKeCloudinary(fFoto) : Promise.resolve("");
        let urlPaspor = fPaspor ? uploadKeCloudinary(fPaspor) : Promise.resolve("");

        const [resKtp, resKk, resNikah, resLahir, resFoto, resPaspor] = await Promise.all([
            urlKtp, urlKk, urlNikah, urlLahir, urlFoto, urlPaspor
        ]);

        const date = new Date();
        const yy = date.getFullYear().toString().slice(-2);
        const mm = ("0" + (date.getMonth() + 1)).slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);
        const noReg = `REG-${yy}${mm}-${random}`;

        const payloadData = {
            paket: document.getElementById('inputPaket').value,
            
            nama: document.getElementById('inputNama').value,
            nik: document.getElementById('inputNik').value,
            tempatLahir: document.getElementById('inputTmpLahir').value,
            tglLahir: document.getElementById('inputTglLahir').value,
            jk: document.getElementById('inputJk').value,
            alamat: document.getElementById('inputAlamat').value,
            kota: document.getElementById('inputKota').value,
            provinsi: document.getElementById('inputProvinsi').value,
            wa: document.getElementById('inputWa').value,
            email: document.getElementById('inputEmail').value,

            daruratNama: document.getElementById('inputDaruratNama').value,
            daruratHub: document.getElementById('inputDaruratHub').value,
            daruratHp: document.getElementById('inputDaruratHp').value,

            mahramNama: document.getElementById('inputMahramNama').value,
            mahramHub: document.getElementById('inputMahramHub').value,

            pasporNo: document.getElementById('inputPasporNo').value,
            pasporTempat: document.getElementById('inputPasporTempat').value,
            pasporTgl: document.getElementById('inputPasporTgl').value,
            pasporExp: document.getElementById('inputPasporExp').value,
            grup: document.getElementById('inputNamaGrup').value,
            requestKamar: document.getElementById('inputRequestKamar').value,

            // PERBAIKAN: Penamaan field penyimpanan
            urlKtp: resKtp,
            urlKK: resKk, // Menjadi urlKK
            urlNikah: resNikah,
            urlLahir: resLahir,
            urlFoto: resFoto,
            urlPaspor: resPaspor,

            status: "Menunggu Verifikasi",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("jemaah").doc(noReg).set(payloadData);

        showCustomAlert(`Pendaftaran berhasil!\nNomor Registrasi: ${noReg}`, "success", "Berhasil");
        loadDataJemaah(); 
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalJemaah'));
        if(modal) modal.hide();

    } catch (error) {
        showCustomAlert("Terjadi kesalahan: " + error.message, "error", "Gagal");
    } finally {
        btn.innerHTML = '<i class="bi bi-save"></i> Simpan Pendaftaran';
        btn.disabled = false;
    }
}

function hapusJemaah(noReg) {
    showCustomConfirm(`Yakin ingin menghapus data jemaah <b>${noReg}</b>?<br><small class="text-danger">Aksi ini tidak dapat dibatalkan.</small>`, () => {
        db.collection("jemaah").doc(noReg).delete().then(() => {
            showCustomAlert("Data jemaah berhasil dihapus.", "success");
            loadDataJemaah();
        }).catch(err => showCustomAlert(err.message, "error"));
    }, "Hapus Data?");
}

// ==========================================
// FUNGSI EDIT JEMAAH (TANPA UPLOAD FILE)
// ==========================================
function bukaModalEditJemaah(encodedJSON) {
    // Cegah aksi default tombol agar halaman tidak mental
    if (event) event.preventDefault(); 
    
    const jm = JSON.parse(decodeURIComponent(encodedJSON));
    
    document.getElementById('editReg').value = jm.id;
    document.getElementById('editNama').value = jm.nama || '';
    document.getElementById('editNik').value = jm.nik || '';
    document.getElementById('editTmpLahir').value = jm.tempatLahir || '';
    document.getElementById('editTglLahir').value = jm.tglLahir || '';
    document.getElementById('editJk').value = jm.jk || 'Laki-laki';
    document.getElementById('editAlamat').value = jm.alamat || '';
    document.getElementById('editKota').value = jm.kota || '';
    document.getElementById('editProvinsi').value = jm.provinsi || '';
    document.getElementById('editWa').value = jm.wa || '';
    document.getElementById('editEmail').value = jm.email || '';
    
    document.getElementById('editMahramNama').value = jm.mahramNama || '';
    document.getElementById('editMahramHub').value = jm.mahramHub || '';
    
    document.getElementById('editPasporNo').value = jm.pasporNo || '';
    document.getElementById('editPasporTempat').value = jm.pasporTempat || '';
    document.getElementById('editPasporTgl').value = jm.pasporTgl || '';
    document.getElementById('editPasporExp').value = jm.pasporExp || '';
    
    document.getElementById('editDaruratNama').value = jm.daruratNama || '';
    document.getElementById('editDaruratHub').value = jm.daruratHub || 'Suami';
    document.getElementById('editDaruratHp').value = jm.daruratHp || '';
    
    // --- PERBAIKAN BAGIAN KAMAR (Menggunakan 'jm') ---
    const elRequest = document.getElementById('editRequestKamar');
    const elGrup = document.getElementById('editNamaGrup');
    
    if (elRequest) elRequest.value = jm.requestKamar || 'Reguler';
    if (elGrup) elGrup.value = jm.grup || '';

    const selectPaket = document.getElementById('editPaket');
    selectPaket.innerHTML = '<option value="">-- Memuat Paket... --</option>';
    db.collection("paket").where("status", "==", "Aktif").get().then((snapshot) => {
        let options = '';
        snapshot.forEach(doc => {
            const isSelected = (doc.data().nama === jm.paket) ? 'selected' : '';
            options += `<option value="${doc.data().nama}" ${isSelected}>${doc.data().nama}</option>`;
        });
        selectPaket.innerHTML = options;
    });
    
    // Panggil logika buka/tutup form kamar khusus edit
    if (typeof aturLogikaKamarEdit === "function") {
        aturLogikaKamarEdit();
    }

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditJemaah'));
    modal.show();
}

// ==========================================
// FUNGSI SIMPAN PERUBAHAN EDIT JEMAAH (KEBAL ERROR)
// ==========================================
async function submitEditJemaah(event) {
    event.preventDefault();
    const btn = document.getElementById('btnUpdateJemaah');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';
    btn.disabled = true;

    // Fungsi pintar untuk mengambil data dengan aman (mencegah error 'null')
    const ambilNilai = (idElem) => {
        const el = document.getElementById(idElem);
        return el ? el.value : '';
    };

    try {
        const noReg = ambilNilai('editReg');
        if (!noReg) throw new Error("ID Jemaah (noReg) tidak ditemukan di form!");

        const payloadData = {
            paket: ambilNilai('editPaket'),
            nama: ambilNilai('editNama'),
            nik: ambilNilai('editNik'),
            tempatLahir: ambilNilai('editTmpLahir'),
            tglLahir: ambilNilai('editTglLahir'),
            jk: ambilNilai('editJk'),
            alamat: ambilNilai('editAlamat'),
            kota: ambilNilai('editKota'),
            provinsi: ambilNilai('editProvinsi'),
            wa: ambilNilai('editWa'),
            email: ambilNilai('editEmail'),
            mahramNama: ambilNilai('editMahramNama'),
            mahramHub: ambilNilai('editMahramHub'),
            pasporNo: ambilNilai('editPasporNo'),
            pasporTempat: ambilNilai('editPasporTempat'),
            pasporTgl: ambilNilai('editPasporTgl'),
            pasporExp: ambilNilai('editPasporExp'),
            daruratNama: ambilNilai('editDaruratNama'),
            daruratHub: ambilNilai('editDaruratHub'),
            daruratHp: ambilNilai('editDaruratHp'),
            
            // Kolom Kamar Khusus
            requestKamar: ambilNilai('editRequestKamar'),
            grup: ambilNilai('editNamaGrup')
        };

        await db.collection("jemaah").doc(noReg).update(payloadData);
        showCustomAlert("Data jemaah berhasil diperbarui!", "success");
        
        // Coba refresh data jika fungsi loadDataJemaah tersedia
        if (typeof loadDataJemaah === "function") loadDataJemaah(); 
        
        bootstrap.Modal.getInstance(document.getElementById('modalEditJemaah')).hide();
    } catch (error) {
        showCustomAlert("Gagal menyimpan: " + error.message, "error");
    } finally {
        btn.innerHTML = '<i class="bi bi-save"></i> Simpan Perubahan Data';
        btn.disabled = false;
    }
}

// Tambahkan di bagian bawah file jemaah.js
async function uploadBerkasJemaah(fileInputId, jenisDokumen, jm) {
    const fileInput = document.getElementById(fileInputId);
    
    // Jika tidak ada file yang dipilih, lewati
    if (!fileInput || !fileInput.files.length) return null; 

    const file = fileInput.files[0];
    const ekstensi = file.name.split('.').pop();
    
    // Membersihkan karakter aneh pada nama dan paket agar aman menjadi nama file
    const namaBersih = jm.nama.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    const paketBersih = jm.paket.replace(/[^a-zA-Z0-9 ]/g, "").trim();

    // Merakit nama baru: "KTP - Lukman Hidayat - Paket Reguler.jpg"
    const namaFileBaru = `${jenisDokumen} - ${namaBersih} - ${paketBersih}.${ekstensi}`;
    
    // Mengatur lokasi folder: BerkasJemaah/ID_JEMAAH/NamaFile
    const storageRef = firebase.storage().ref(`BerkasJemaah/${jm.id}/${namaFileBaru}`);
    
    try {
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        return {
            url: downloadURL,
            namaFile: namaFileBaru // Simpan juga nama filenya untuk keperluan backup
        };
    } catch (error) {
        console.error(`Gagal upload ${jenisDokumen}:`, error);
        throw error;
    }
}

// Fungsi untuk memaksa download file dari URL Firebase ke Laptop
async function unduhBerkasKePC(url, namaFileBaru) {
    try {
        // Tampilkan loading swal (opsional)
        Swal.fire({ title: 'Mengunduh Berkas...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Buat link tak kasat mata untuk memicu download
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = namaFileBaru; 
        document.body.appendChild(link);
        link.click(); // Eksekusi klik otomatis
        document.body.removeChild(link);
        
        Swal.close();
    } catch (err) {
        Swal.fire('Gagal', 'Tidak dapat mengunduh berkas. Pastikan koneksi stabil.', 'error');
    }
}

function aturLogikaKamar() {
    const pilihan = document.getElementById('jm-request-kamar').value;
    const inputGrup = document.getElementById('jm-nama-grup');
    const labelGrup = document.getElementById('label-nama-grup');

    if (pilihan === 'Grup') {
        // Unfreeze: Buka gembok jika memilih Grup
        inputGrup.disabled = false;
        inputGrup.classList.add('border-primary');
        labelGrup.classList.remove('text-muted');
        labelGrup.classList.add('text-primary');
        inputGrup.focus();
    } else {
        // Freeze: Kunci kembali dan kosongkan nilainya
        inputGrup.disabled = true;
        inputGrup.value = ''; 
        inputGrup.classList.remove('border-primary');
        labelGrup.classList.add('text-muted');
        labelGrup.classList.remove('text-primary');
    }
}

// ==========================================
// FUNGSI UPDATE BERKAS DARI MODAL DETAIL
// ==========================================
async function prosesUpdateBerkas(jenis) {
    const fileInput = document.getElementById(`updFile${jenis}`);
    if (!fileInput || fileInput.files.length === 0) return;

    const noReg = document.getElementById('detNoReg').innerText;
    
    Swal.fire({
        title: 'Mengupload Berkas...',
        html: `Silakan tunggu, sedang memperbarui file ${jenis}.`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const urlFile = await uploadKeCloudinary(fileInput.files[0]);
        let updateData = {};
        
        // Penyesuaian nama field di Firebase
        let fieldName = `url${jenis}`;
        if (jenis === 'Kk' || jenis === 'KK') {
            fieldName = 'urlKK';
        }
        updateData[fieldName] = urlFile; 

        // Update ke Firebase
        await db.collection("jemaah").doc(noReg).update(updateData);
        
        // Pemisahan logika untuk Foto, Vaksin, dan Berkas lainnya
        if (jenis === 'Foto') {
            const imgElement = document.getElementById('detFoto');
            if (imgElement) imgElement.src = urlFile;
        } else {
            const badgeElement = document.getElementById(`badge${jenis}`);
            const btnElement = document.getElementById(`btnUpd${jenis}`);
            
            if (badgeElement) {
                badgeElement.innerHTML = `<a href="${urlFile}" target="_blank" class="badge bg-success text-decoration-none shadow-sm px-2 py-1"><i class="bi bi-eye-fill me-1"></i>Lihat File</a>`;
            }
            if (btnElement) {
                btnElement.className = "btn btn-info btn-sm py-0 shadow-sm text-white fw-bold";
                btnElement.innerHTML = "Update";
            }
        }
        
        showCustomAlert(`Berkas ${jenis} berhasil diperbarui!`, "success");
        loadDataJemaah(); // Refresh tabel di latar belakang
        

    } catch (error) {
        showCustomAlert(`Gagal upload berkas: ${error.message}`, "error");
    } finally {
        fileInput.value = ''; // Kosongkan kembali memori input
    }
}

// ==========================================
// FUNGSI CETAK BUKTI PENDAFTARAN
// ==========================================
async function cetakBuktiPendaftaran(jm) {
    // Buka jendela cetak SEBELUM memuat data agar tidak diblokir oleh browser
    const printWin = window.open('', '_blank');
    printWin.document.write('<html><body style="font-family:sans-serif;text-align:center;margin-top:20%;color:#555;"><h3>Menyiapkan Dokumen...</h3></body></html>');

    // 1. Siapkan Gambar Foto
    const imgFoto = (jm.urlFoto && jm.urlFoto !== "") 
        ? `<img src="${jm.urlFoto}" alt="Pas Foto">` 
        : `<div class="foto-kosong">FOTO<br>3x4</div>`;

    // 2. Siapkan Logika Pengecekan Berkas
    const cek = (url) => (url && url !== "") ? '<strong>TERLAMPIR</strong>' : 'Belum Ada';

    // 3. Format Tanggal
    let tglDaftar = '-';
    if (jm.createdAt && jm.createdAt.seconds) {
        tglDaftar = new Date(jm.createdAt.seconds * 1000).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
    }
    let masaBerlaku = '-';
    if (jm.pasporTgl && jm.pasporExp) {
        let terbit = new Date(jm.pasporTgl).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'});
        let exp = new Date(jm.pasporExp).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'});
        masaBerlaku = `${terbit} s.d ${exp}`;
    }

    // 4. Susun KOP Surat Resmi
    const logoKiri = (window.konfigurasiSurat && window.konfigurasiSurat.logoKiri) ? `<img src="${window.konfigurasiSurat.logoKiri}" style="max-height: 65px; max-width: 100%;">` : '';
    const logoKanan = (window.konfigurasiSurat && window.konfigurasiSurat.logoKanan) ? `<img src="${window.konfigurasiSurat.logoKanan}" style="max-height: 65px; max-width: 100%;">` : '';
    const namaTravel = (window.konfigurasiSurat && window.konfigurasiSurat.nama) ? window.konfigurasiSurat.nama.text : "PT. ENKA IMRON MANDIRI";
    const alamatTravel = (window.konfigurasiSurat && window.konfigurasiSurat.alamat) ? window.konfigurasiSurat.alamat.text : "Pamekasan, Jawa Timur";

    const kopSuratHtml = `
        <table style="width: 100%; border-bottom: 3px solid #000; margin-bottom: 10px; padding-bottom: 5px;">
            <tr>
                <td style="width: 15%; text-align: left; vertical-align: middle;">${logoKiri}</td>
                <td style="width: 70%; text-align: center; vertical-align: middle;">
                    <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; font-weight: bold;">${namaTravel}</h2>
                    <p style="margin: 3px 0 0; font-size: 10px;">${alamatTravel}</p>
                </td>
                <td style="width: 15%; text-align: right; vertical-align: middle;">${logoKanan}</td>
            </tr>
        </table>
    `;

    // 5. AMBIL NAMA PETUGAS DARI FIRESTORE (Koleksi: Pengguna)
    // 5. AMBIL NAMA PETUGAS DARI SESSION STORAGE LOKAL (Tercepat & Terakurat)
    let namaPetugas = 'PETUGAS PENDAFTARAN';
    const sesiAktif = sessionStorage.getItem('siUmrohUser');
    if (sesiAktif) {
        try {
            const userData = JSON.parse(sesiAktif);
            // Mengambil field 'nama' dari hasil login di auth.js
            if (userData.nama) {
                namaPetugas = userData.nama.toUpperCase();
            } else {
                namaPetugas = userData.username.toUpperCase();
            }
        } catch (e) {
            console.error("Gagal membaca sesi pengguna:", e);
        }
    }

    // 6. Cetak ke Jendela (Timpa pesan Loading)
    printWin.document.open();
    printWin.document.write(`
        <html>
        <head>
            <title>Formulir Pendaftaran - ${jm.nama}</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 0; font-size: 10px; color: #000; margin: 0; }
                
                .judul { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 12px; text-decoration: underline; letter-spacing: 1px; }
                
                .header-info { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: flex-start; }
                .info-kiri { width: 78%; }
                .info-kiri table { width: 100%; border-collapse: collapse; }
                .info-kiri td { padding: 3px 0; font-size: 11px; vertical-align: middle; }
                .info-kiri td.label { width: 22%; font-weight: bold; }
                .info-kiri td.titik { width: 3%; }
                
                .foto-box { width: 80px; height: 110px; border: 2px solid #333; display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; background: #f9f9f9; }
                .foto-box img { width: 100%; height: 100%; object-fit: cover; }
                .foto-kosong { color: #999; font-size: 11px; font-weight: bold; }
                
                .tabel-detail { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                .tabel-detail th { background-color: #eee; font-weight: bold; text-align: left; padding: 4px 6px; border: 1px solid #000; font-size: 11px; }
                .tabel-detail td { padding: 4px 6px; border: 1px solid #000; vertical-align: middle; font-size: 11px; }
                .tabel-detail td.col-label { width: 30%; font-weight: bold; }
                
                .ttd-area { display: flex; justify-content: space-between; margin-top: 15px; text-align: center; }
                .ttd-box { width: 220px; font-size: 11px; }
                .ttd-nama { margin-top: 50px; font-weight: bold; text-decoration: underline; text-transform: uppercase; font-size: 11px;}
                
                @media print { 
                    @page { size: A4 portrait; margin: 10mm; } 
                    body { -webkit-print-color-adjust: exact; } 
                }
            </style>
        </head>
        <body>
            ${kopSuratHtml}
            
            <div class="judul">FORMULIR PENDAFTARAN UMROH</div>
            
            <div class="header-info">
                <div class="info-kiri">
                    <table>
                        <tr><td class="label">ID Pendaftaran</td><td class="titik">:</td><td><strong>${jm.id}</strong></td></tr>
                        <tr><td class="label">Tanggal Daftar</td><td class="titik">:</td><td>${tglDaftar}</td></tr>
                        <tr><td class="label">Paket Pilihan</td><td class="titik">:</td><td><strong>${jm.paket || '-'}</strong></td></tr>
                        <tr><td class="label">Status</td><td class="titik">:</td><td><strong>${jm.status || '-'}</strong></td></tr>
                    </table>
                </div>
                <div class="foto-box">
                    ${imgFoto}
                </div>
            </div>
            
            <table class="tabel-detail">
                <tr><th colspan="2">A. DATA PRIBADI JEMAAH</th></tr>
                <tr><td class="col-label">Nama Lengkap</td><td>${jm.nama || '-'}</td></tr>
                <tr><td class="col-label">NIK KTP</td><td>${jm.nik || '-'}</td></tr>
                <tr><td class="col-label">Tempat, Tgl Lahir</td><td>${jm.tempatLahir || '-'}, ${jm.tglLahir || '-'}</td></tr>
                <tr><td class="col-label">Jenis Kelamin</td><td>${jm.jk || '-'}</td></tr>
                <tr><td class="col-label">Alamat Lengkap</td><td>${jm.alamat || '-'}</td></tr>
                <tr><td class="col-label">No. Handphone / WA</td><td>${jm.wa || '-'}</td></tr>
                <tr><td class="col-label">Email</td><td>${jm.email || '-'}</td></tr>
            </table>

            <table class="tabel-detail">
                <tr><th colspan="2">B. DATA KEIMIGRASIAN & MAHRAM</th></tr>
                <tr><td class="col-label">Nomor Paspor</td><td>${jm.pasporNo || '-'}</td></tr>
                <tr><td class="col-label">Tempat Terbit</td><td>${jm.pasporTempat || '-'}</td></tr>
                <tr><td class="col-label">Masa Berlaku</td><td>${masaBerlaku}</td></tr>
                <tr><td class="col-label">Pendamping (Mahram)</td><td>${jm.mahramNama ? `${jm.mahramNama} (Hubungan: ${jm.mahramHub || '-'})` : '-'}</td></tr>
            </table>

            <table class="tabel-detail">
                <tr><th colspan="2">C. KONTAK DARURAT (Keluarga yang dihubungi)</th></tr>
                <tr><td class="col-label">Nama Kontak</td><td>${jm.daruratNama || '-'}</td></tr>
                <tr><td class="col-label">Hubungan</td><td>${jm.daruratHub || '-'}</td></tr>
                <tr><td class="col-label">Nomor HP</td><td>${jm.daruratHp || '-'}</td></tr>
            </table>

            <table class="tabel-detail">
                <tr><th colspan="2">D. STATUS KELENGKAPAN BERKAS</th></tr>
                <tr><td class="col-label">Kartu Tanda Penduduk (KTP)</td><td>${cek(jm.urlKtp)}</td></tr>
                <tr><td class="col-label">Kartu Keluarga (KK)</td><td>${cek(jm.urlKk || jm.urlKK)}</td></tr>
                <tr><td class="col-label">Akte Kelahiran</td><td>${cek(jm.urlLahir)}</td></tr>
                <tr><td class="col-label">Buku Nikah</td><td>${cek(jm.urlNikah)}</td></tr>
                <tr><td class="col-label">Paspor Asli</td><td>${cek(jm.urlPaspor)}</td></tr>
            </table>

            <div class="ttd-area">
                <div class="ttd-box">
                    Pendaftar / Jemaah<br><br>
                    <div class="ttd-nama">${jm.nama || '-'}</div>
                </div>
                <div class="ttd-box">
                    Pamekasan, ${new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}<br>
                    Petugas Pendaftaran<br><br>
                    <div class="ttd-nama">${namaPetugas}</div>
                </div>
            </div>
            
            <script>
                window.onload = () => { setTimeout(() => window.print(), 800); }
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}

function aturLogikaKamarTambah() {
    const pilihan = document.getElementById('inputRequestKamar').value;
    const inputGrup = document.getElementById('inputNamaGrup');
    if (pilihan === 'Grup') {
        inputGrup.disabled = false; inputGrup.classList.add('border-primary'); inputGrup.focus();
    } else {
        inputGrup.disabled = true; inputGrup.value = ''; inputGrup.classList.remove('border-primary');
    }
}

function aturLogikaKamarEdit() {
    const pilihan = document.getElementById('editRequestKamar');
    const inputGrup = document.getElementById('editNamaGrup');
    if (!pilihan || !inputGrup) return;
    if (pilihan.value === 'Grup') {
        inputGrup.disabled = false; inputGrup.classList.add('border-primary');
    } else {
        inputGrup.disabled = true; inputGrup.value = ''; inputGrup.classList.remove('border-primary');
    }
}

async function bukaModalExport() {
    const selectPaket = document.getElementById('export-paket');
    selectPaket.innerHTML = '<option value="Semua">Semua Paket (Seluruh Data)</option>';

    try {
        const snap = await db.collection("paket").where("status", "==", "Aktif").get();
        snap.forEach(doc => {
            selectPaket.innerHTML += `<option value="${doc.data().nama}">${doc.data().nama}</option>`;
        });
    } catch (e) { console.error(e); }

    new bootstrap.Modal(document.getElementById('modalExportExcel')).show();
}

async function prosesExportExcel() {
    const btn = document.getElementById('btnProsesExport');
    const paketPilihan = document.getElementById('export-paket').value;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyusun Data...';
    btn.disabled = true;

    try {
        let query = db.collection("jemaah").orderBy("createdAt", "desc");
        if (paketPilihan !== "Semua") query = db.collection("jemaah").where("paket", "==", paketPilihan);
        
        const snapshot = await query.get();
        if (snapshot.empty) {
            Swal.fire('Kosong', 'Tidak ada data jemaah.', 'warning');
            btn.innerHTML = '<i class="bi bi-download me-1"></i> Download Excel'; btn.disabled = false;
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data Jemaah');

        worksheet.columns = [
            { header: 'NO', key: 'no', width: 5 },
            { header: 'NAMA LENGKAP', key: 'nama', width: 30 },
            { header: 'NIK', key: 'nik', width: 22 },
            { header: 'TEMPAT LAHIR', key: 'tempatLahir', width: 18 },
            { header: 'TGL LAHIR', key: 'tglLahir', width: 15 },
            { header: 'USIA', key: 'usia', width: 8 },
            { header: 'JENIS KELAMIN', key: 'jk', width: 15 },
            { header: 'ALAMAT LENGKAP', key: 'alamat', width: 45 },
            { header: 'NO. WA', key: 'wa', width: 18 },
            { header: 'PAKET UMROH', key: 'paket', width: 30 },
            { header: 'STATUS', key: 'status', width: 15 },
            { header: 'MAHRAM/GRUP', key: 'mahram', width: 25 },
            { header: 'REQ KAMAR', key: 'kamar', width: 20 }
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } }; // Warna Biru Primary
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        headerRow.height = 25;

        let no = 1;
        snapshot.forEach(doc => {
            const jm = doc.data();
            let usia = '?';
            if (jm.tglLahir) {
                const bd = new Date(jm.tglLahir); const td = new Date();
                let age = td.getFullYear() - bd.getFullYear();
                if (td.getMonth() < bd.getMonth() || (td.getMonth() === bd.getMonth() && td.getDate() < bd.getDate())) age--;
                usia = age;
            }

            const row = worksheet.addRow({
                no: no++, nama: jm.nama || '-', nik: jm.nik || '-', tempatLahir: jm.tempatLahir || '-',
                tglLahir: jm.tglLahir || '-', usia: usia, jk: jm.jk || '-', alamat: jm.alamat || '-',
                wa: jm.wa || '-', paket: jm.paket || '-', status: jm.status || '-', 
                mahram: jm.mahramNama || jm.grupKeluarga || '-', kamar: jm.requestKamar || jm.reqKhusus || '-'
            });

            row.eachCell((cell) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                cell.alignment = { vertical: 'middle', wrapText: true };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), paketPilihan === "Semua" ? "Data_Semua_Jemaah.xlsx" : `Data_Jemaah_${paketPilihan}.xlsx`);
        
        bootstrap.Modal.getInstance(document.getElementById('modalExportExcel')).hide();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Berhasil Diunduh!', timer: 2000, showConfirmButton: false });

    } catch (error) { Swal.fire('Error', error.message, 'error'); }
    finally { btn.innerHTML = '<i class="bi bi-download me-1"></i> Download Excel'; btn.disabled = false; }
}

// 1. FUNGSI DOWNLOAD SATUAN DARI CLOUDINARY
async function unduhBerkasSatuan(urlCloudinary, namaFileBaru) {
    try {
        Swal.fire({ title: 'Mengunduh Berkas...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        const response = await fetch(urlCloudinary);
        const blob = await response.blob();
        
        // Ambil ekstensi asli dari Cloudinary URL (biasanya .jpg atau .pdf)
        const ekstensi = urlCloudinary.split('.').pop().split(/#|\?/)[0]; 
        
        saveAs(blob, `${namaFileBaru}.${ekstensi}`);
        Swal.close();
    } catch (err) {
        Swal.fire('Gagal', 'Gagal mengunduh file dari Cloudinary.', 'error');
    }
}

// 2. FUNGSI MASTER BACKUP (ZIP + EXCEL DETAIL)
// Pastikan fungsi ini dipanggil dari tombol Backup dengan mengirimkan data jemaahnya
// Contoh pada onclick: onclick="prosesBackupJemaah(dataJemaahAktif)"
async function prosesBackupJemaah(jm) {
    const btn = document.getElementById('btnBackupJemaah');
    const oriText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memproses Backup...';
    btn.disabled = true;

    try {
        const zip = new JSZip();
        const folderBerkas = zip.folder("Berkas_Fisik");

        // A. MASUKKAN SEMUA BERKAS KE DALAM ZIP (Menggunakan variabel yang benar)
        const listBerkas = [
            { url: jm.urlFoto, nama: `Pas Foto - ${jm.nama}` }, // <-- Tambahan Pas Foto
            { url: jm.urlKtp, nama: `KTP - ${jm.nama}` },
            { url: jm.urlKk || jm.urlKK, nama: `Kartu Keluarga - ${jm.nama}` },
            { url: jm.urlNikah, nama: `Buku Nikah - ${jm.nama}` },
            { url: jm.urlPaspor, nama: `Paspor - ${jm.nama}` },
            { url: jm.urlLahir, nama: `Akte Lahir - ${jm.nama}` },
            { url: jm.urlVaksin, nama: `Sertifikat Vaksin - ${jm.nama}` }
        ];

        for (let berkas of listBerkas) {
            if (berkas.url && berkas.url !== "") {
                try {
                    const response = await fetch(berkas.url);
                    const blob = await response.blob();
                    // Ambil ekstensi file dari URL Cloudinary
                    const ekstensi = berkas.url.split('.').pop().split(/#|\?/)[0];
                    folderBerkas.file(`${berkas.nama}.${ekstensi}`, blob);
                } catch (e) {
                    console.error("Gagal mengunduh berkas:", berkas.nama);
                }
            }
        }

        // B. BUAT FILE EXCEL DETAIL JEMAAH (LENGKAP)
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Detail Jemaah');
        
        worksheet.columns = [
            { header: 'INFORMASI', key: 'info', width: 25 },
            { header: 'DATA JEMAAH', key: 'data', width: 55 }
        ];

        // Warnai Header
        worksheet.getRow(1).eachCell(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } };
            c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        });

        // Format Masa Berlaku Paspor
        let masaBerlaku = '-';
        if (jm.pasporTgl && jm.pasporExp) {
            let terbit = new Date(jm.pasporTgl).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
            let exp = new Date(jm.pasporExp).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
            masaBerlaku = `${terbit} s.d ${exp}`;
        }

        // Format Mahram
        let infoMahram = '-';
        if (jm.mahramNama) infoMahram = `${jm.mahramNama} (Status: ${jm.mahramHub || '-'})`;

        // Masukkan Baris Data Lengkap
        const dataBaris = [
            { info: 'ID Pendaftaran', data: jm.id },
            { info: 'Nama Lengkap', data: jm.nama || '-' },
            { info: 'NIK KTP', data: jm.nik || '-' },
            { info: 'Tempat, Tgl Lahir', data: `${jm.tempatLahir || '-'}, ${jm.tglLahir || '-'}` },
            { info: 'Jenis Kelamin', data: jm.jk || '-' },
            { info: 'Alamat Lengkap', data: jm.alamat || '-' },
            { info: 'No. Handphone', data: jm.wa || '-' },
            { info: 'Email', data: jm.email || '-' },
            { info: 'Paket Pilihan', data: jm.paket || '-' },
            { info: 'Nomor Paspor', data: jm.pasporNo || '-' },
            { info: 'Tempat Terbit', data: jm.pasporTempat || '-' },
            { info: 'Masa Berlaku', data: masaBerlaku },
            { info: 'Mahram', data: infoMahram },
            { info: 'Nama Kontak Darurat', data: jm.daruratNama || '-' },
            { info: 'Hubungan K. Darurat', data: jm.daruratHub || '-' },
            { info: 'No. HP K. Darurat', data: jm.daruratHp || '-' }
        ];

        dataBaris.forEach(item => worksheet.addRow(item));
        
        // Beri border pada tabel Excel
        worksheet.eachRow(row => {
            row.eachCell(cell => { 
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; 
                cell.alignment = { vertical: 'middle', wrapText: true };
            });
        });

        // Masukkan Excel ke dalam ZIP
        const excelBuffer = await workbook.xlsx.writeBuffer();
        zip.file(`Data_Lengkap_${jm.nama}.xlsx`, excelBuffer);

        // C. GENERATE ZIP & DOWNLOAD
        const zipContent = await zip.generateAsync({ type: "blob" });
        saveAs(zipContent, `Backup_${jm.nama.replace(/ /g, '_')}_${jm.id}.zip`);

        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Backup Selesai!', timer: 2500, showConfirmButton: false });

    } catch (error) {
        console.error(error);
        Swal.fire('Error Backup', 'Terjadi kesalahan saat mengemas file.', 'error');
    } finally {
        btn.innerHTML = oriText;
        btn.disabled = false;
    }
}