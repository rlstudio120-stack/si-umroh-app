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
                emptyTable: "Belum ada data jemaah untuk paket dan tahun tersebut."
            },
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Semua"]], // Teks Opsi Dropdown
            pageLength: 10,
            // Perhatikan tambahan huruf 'l' (lengthMenu) dan margin kanan me-3 di bawah ini
            dom: '<"d-flex flex-wrap justify-content-between align-items-center mb-3"<"d-flex align-items-center"l><"d-flex gap-2"Bf>>rt<"d-flex flex-wrap justify-content-between align-items-center mt-3"ip>',
            buttons: [
                { extend: 'excelHtml5', text: '<i class="bi bi-file-earmark-excel me-1"></i> Excel', className: 'btn btn-success btn-sm shadow-sm fw-bold', title: `Data Jemaah - ${valPaket}`, exportOptions: { columns: [0, 1, 2, 3] } }
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
    const setBerkas = (url, badgeId) => {
        const badge = document.getElementById(badgeId);
        if (url) {
            badge.innerHTML = '<span class="badge bg-success">Sudah Ada</span>';
        } else {
            badge.innerHTML = '<span class="badge bg-danger">Belum</span>';
        }
    };
    
    // PERBAIKAN: Penamaan field diselaraskan dengan index.html
    setBerkas(jm.urlKtp, 'badgeKtp');
    setBerkas(jm.urlKk, 'badgeKk'); 
    setBerkas(jm.urlNikah, 'badgeNikah');
    setBerkas(jm.urlPaspor, 'badgePaspor');
    setBerkas(jm.urlLahir, 'badgeLahir');

    // --- KOLOM KANAN (INFORMASI PRIBADI) ---
    document.getElementById('detNikKtp').innerText = jm.nik || '-';
    
    let tempatTglLahir = (jm.tempatLahir || '-') + ', ' + (jm.tglLahir ? new Date(jm.tglLahir).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'}) : '-');
    document.getElementById('detTempatTglLahir').innerText = tempatTglLahir;
    
    document.getElementById('detJk').innerText = jm.jk || '-';
    
    let alamatLengkap = (jm.alamat || '-') + ', ' + (jm.kota || '-') + ' - ' + (jm.provinsi || '-');
    document.getElementById('detAlamat').innerText = alamatLengkap;
    
    document.getElementById('detNoHp').innerText = jm.wa || '-';
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
        
        // PERBAIKAN: Pemisahan logika untuk Foto dan Berkas Teks
        if (jenis === 'Foto') {
            // Jika Foto, ganti gambar profil langsung
            const imgElement = document.getElementById('detFoto');
            if (imgElement) imgElement.src = urlFile;
        } else {
            // Jika dokumen lain, ubah lencana (badge) menjadi hijau
            const badgeElement = document.getElementById(`badge${jenis}`);
            if (badgeElement) badgeElement.innerHTML = '<span class="badge bg-success">Sudah Ada</span>';
        }
        
        showCustomAlert(`Berkas berhasil diperbarui!`, "success");
        loadDataJemaah(); // Refresh data tabel di latar belakang
    } catch (error) {
        showCustomAlert(`Gagal upload berkas: ${error.message}`, "error");
    } finally {
        fileInput.value = ''; // Kosongkan kembali memori input
    }
}

// ==========================================
// FUNGSI CETAK BUKTI PENDAFTARAN
// ==========================================
function cetakBuktiPendaftaran(jm) {
    const tglDaftar = jm.createdAt && jm.createdAt.seconds 
        ? new Date(jm.createdAt.seconds * 1000).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'}) 
        : '-';

    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Bukti Pendaftaran - ${jm.id}</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                .kop-surat { text-align: center; border-bottom: 3px solid #1a237e; padding-bottom: 20px; margin-bottom: 30px; }
                .kop-surat h1 { margin: 0; color: #1a237e; font-size: 24px; text-transform: uppercase; }
                .kop-surat p { margin: 5px 0 0 0; font-size: 14px; color: #666; }
                h3 { text-align: center; margin-bottom: 30px; text-decoration: underline; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 15px; }
                td { padding: 10px 5px; vertical-align: top; }
                .label-col { width: 30%; font-weight: bold; }
                .footer { margin-top: 50px; text-align: right; font-size: 14px; }
                .ttd-box { display: inline-block; text-align: center; width: 200px; margin-top: 20px; }
                .ttd-box p { margin-top: 80px; font-weight: bold; text-decoration: underline; }
                
                @media print { 
                    @page { margin: 0; } 
                    body { -webkit-print-color-adjust: exact; } 
                }
            </style>
        </head>
        <body>
            <div class="kop-surat">
                <h1>ENKA IMRON MANDIRI</h1>
                <p>Penyelenggara Perjalanan Ibadah Umroh & Haji Khusus</p>
                <p>Jl. Dirgahayu, Pamekasan, Jawa Timur</p>
            </div>
            
            <h3>TANDA BUKTI PENDAFTARAN JEMAAH UMROH</h3>
            
            <table>
                <tr><td class="label-col">No. Registrasi</td><td>: <strong>${jm.id}</strong></td></tr>
                <tr><td class="label-col">Tanggal Mendaftar</td><td>: ${tglDaftar}</td></tr>
                <tr><td class="label-col">Nama Jemaah</td><td>: ${jm.nama || '-'}</td></tr>
                <tr><td class="label-col">NIK KTP</td><td>: ${jm.nik || '-'}</td></tr>
                <tr><td class="label-col">Tempat, Tgl Lahir</td><td>: ${(jm.tempatLahir || '-')} , ${(jm.tglLahir || '-')}</td></tr>
                <tr><td class="label-col">No. Handphone / WA</td><td>: ${jm.wa || '-'}</td></tr>
                <tr><td class="label-col">Paket Pilihan</td><td>: <strong>${jm.paket || '-'}</strong></td></tr>
                <tr><td class="label-col">Status Pendaftaran</td><td>: ${jm.status || '-'}</td></tr>
            </table>

            <div class="footer">
                Pamekasan, ${new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}<br>
                Petugas Pendaftaran,
                <div class="ttd-box">
                    <p>Admin SI Umroh</p>
                </div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
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