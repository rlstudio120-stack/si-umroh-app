// js/modules/jemaah.js

function loadDataJemaah() {
    const tbody = document.getElementById('tabel-jemaah-body');
    if (!tbody) return;
    
    if ($.fn.DataTable.isDataTable('#tabel-jemaah')) {
        $('#tabel-jemaah').DataTable().destroy();
    }

    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span> Memuat data jemaah...</td></tr>`;

    db.collection("jemaah").orderBy("createdAt", "desc").get().then((querySnapshot) => {
        tbody.innerHTML = '';
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                const jm = doc.data();
                const noReg = doc.id;
                
                let badgeColor = 'bg-secondary';
                if (jm.status === 'Menunggu Verifikasi') badgeColor = 'bg-warning text-dark';
                else if (jm.status === 'Siap Berangkat') badgeColor = 'bg-success';
                
                // Siapkan data JSON untuk dikirim ke Modal Detail
                const jmJSON = encodeURIComponent(JSON.stringify({id: noReg, ...jm}));
                
                const row = `
                  <tr>
                    <!-- Disembunyikan di HP (d-none d-md-table-cell) -->
                    <td class="ps-4 fw-bold text-primary whitespace-nowrap d-none d-md-table-cell">${noReg}</td>
                    
                    <td class="fw-bold">${jm.nama || '-'}</td>
                    
                    <!-- Disembunyikan di HP -->
                    <td class="d-none d-md-table-cell">${jm.paket || '-'}</td>
                    
                    <td><span class="badge ${badgeColor}">${jm.status || '-'}</span></td>
                    
                    <td class="text-center whitespace-nowrap">
                      <!-- Tombol Detail (Kaca Pembesar) -->
                      <button class="btn btn-sm btn-primary me-1 shadow-sm" title="Detail Jemaah" onclick="lihatDetailJemaah('${jmJSON}')">
                        <i class="bi bi-search"></i>
                      </button>
                      <button class="btn btn-sm btn-danger shadow-sm" onclick="hapusJemaah('${noReg}')">
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
        }

        $('#tabel-jemaah').DataTable({
            language: { 
                url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/id.json',
                emptyTable: "Belum ada data jemaah yang mendaftar."
            },
            pageLength: 10,
            destroy: true,
        });

    }).catch((error) => {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Gagal memuat: ${error.message}</td></tr>`;
    });
}

// ==========================================
// FUNGSI UNTUK MEMBUKA MODAL DETAIL (DESAIN BARU)
// ==========================================
function lihatDetailJemaah(encodedJSON) {
    const jm = JSON.parse(decodeURIComponent(encodedJSON));
    
    // --- KOLOM KIRI (PROFIL SINGKAT) ---
    document.getElementById('detFoto').src = jm.urlFoto || 'https://via.placeholder.com/150?text=Tanpa+Foto';
    document.getElementById('detNamaSingkat').innerText = jm.nama || '-';
    document.getElementById('detNoReg').innerText = jm.id;
    document.getElementById('detPaketPilihan').innerText = jm.paket || '-';
    
    // Format Tanggal Daftar
    let tglDaftar = '-';
    if (jm.createdAt && jm.createdAt.seconds) {
        tglDaftar = new Date(jm.createdAt.seconds * 1000).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'});
    }
    document.getElementById('detTglDaftar').innerText = tglDaftar;

    // Status Badge
    let badgeColor = 'bg-secondary';
    if (jm.status === 'Menunggu Verifikasi') badgeColor = 'bg-success'; // Di desain warnanya hijau
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
    
    setBerkas(jm.urlKtp, 'badgeKtp');
    setBerkas(jm.urlKk, 'badgeKk');
    setBerkas(jm.urlNikah, 'badgeNikah');
    setBerkas(jm.urlPaspor, 'badgePaspor');
    setBerkas(jm.urlLahir, 'badgeLahir');

    // --- KOLOM KANAN (INFORMASI PRIBADI) ---
    document.getElementById('detNikKtp').innerText = jm.nik || '-';
    
    // Gabung Tempat & Tanggal Lahir
    let tempatTglLahir = (jm.tempatLahir || '-') + ', ' + (jm.tglLahir ? new Date(jm.tglLahir).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'}) : '-');
    document.getElementById('detTempatTglLahir').innerText = tempatTglLahir;
    
    document.getElementById('detJk').innerText = jm.jk || '-';
    
    // Gabung Alamat Lengkap
    let alamatLengkap = (jm.alamat || '-') + ', ' + (jm.kota || '-') + ' - ' + (jm.provinsi || '-');
    document.getElementById('detAlamat').innerText = alamatLengkap;
    
    document.getElementById('detNoHp').innerText = jm.wa || '-';
    document.getElementById('detEmail').innerText = jm.email || '-';

    // --- KOLOM KANAN (KEIMIGRASIAN & MAHRAM) ---
    document.getElementById('detNoPaspor').innerText = jm.pasporNo || '-';
    document.getElementById('detTempatTerbit').innerText = jm.pasporTempat || '-';
    
    // Gabung Masa Berlaku Paspor
    let masaBerlaku = '-';
    if (jm.pasporTgl && jm.pasporExp) {
        let terbit = new Date(jm.pasporTgl).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
        let exp = new Date(jm.pasporExp).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
        masaBerlaku = `${terbit} s.d ${exp}`;
    }
    document.getElementById('detMasaBerlaku').innerText = masaBerlaku;
    
    // Gabung Mahram
    let infoMahram = '-';
    if (jm.mahramNama) infoMahram = `${jm.mahramNama} (${jm.mahramHub || '-'})`;
    document.getElementById('detMahram').innerText = infoMahram;

    // --- KOLOM KANAN (KONTAK DARURAT) ---
    document.getElementById('detDaruratNama').innerText = jm.daruratNama || '-';
    document.getElementById('detDaruratHubHp').innerText = (jm.daruratHub || '-') + ' / ' + (jm.daruratHp || '-');

    // Setel aksi Tombol Edit Data Jemaah (Bawah Kanan)
    const btnEdit = document.getElementById('btnEditDariDetail');
    btnEdit.onclick = function() {
        bootstrap.Modal.getInstance(document.getElementById('modalDetailJemaah')).hide();
        bukaModalEditJemaah(encodedJSON);
    };

    // Setel aksi Tombol Cetak Bukti
    const btnCetak = document.getElementById('btnCetakBukti');
    btnCetak.onclick = function() {
        cetakBuktiPendaftaran(jm);
    };

    // Tampilkan Modal
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
        // Siapkan array untuk menampung proses upload agar berjalan serentak
        let uploadPromises = [];
        
        const fKtp = document.getElementById('fileKtp').files[0];
        const fKk = document.getElementById('fileKk').files[0];
        const fNikah = document.getElementById('fileNikah').files[0];
        const fLahir = document.getElementById('fileLahir').files[0];
        const fFoto = document.getElementById('fileFoto').files[0];
        const fPaspor = document.getElementById('filePaspor').files[0];

        // Masukkan file yang ada ke antrean upload
        let urlKtp = fKtp ? uploadKeCloudinary(fKtp) : Promise.resolve("");
        let urlKk = fKk ? uploadKeCloudinary(fKk) : Promise.resolve("");
        let urlNikah = fNikah ? uploadKeCloudinary(fNikah) : Promise.resolve("");
        let urlLahir = fLahir ? uploadKeCloudinary(fLahir) : Promise.resolve("");
        let urlFoto = fFoto ? uploadKeCloudinary(fFoto) : Promise.resolve("");
        let urlPaspor = fPaspor ? uploadKeCloudinary(fPaspor) : Promise.resolve("");

        // Eksekusi semua upload secara bersamaan (jauh lebih cepat)
        const [resKtp, resKk, resNikah, resLahir, resFoto, resPaspor] = await Promise.all([
            urlKtp, urlKk, urlNikah, urlLahir, urlFoto, urlPaspor
        ]);

        // Buat Nomor Registrasi
        const date = new Date();
        const yy = date.getFullYear().toString().slice(-2);
        const mm = ("0" + (date.getMonth() + 1)).slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);
        const noReg = `REG-${yy}${mm}-${random}`;

        // Kumpulkan Data Form
        const payloadData = {
            paket: document.getElementById('inputPaket').value,
            
            // Data Diri
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

            // Kontak Darurat
            daruratNama: document.getElementById('inputDaruratNama').value,
            daruratHub: document.getElementById('inputDaruratHub').value,
            daruratHp: document.getElementById('inputDaruratHp').value,

            // Mahram
            mahramNama: document.getElementById('inputMahramNama').value,
            mahramHub: document.getElementById('inputMahramHub').value,

            // Paspor
            pasporNo: document.getElementById('inputPasporNo').value,
            pasporTempat: document.getElementById('inputPasporTempat').value,
            pasporTgl: document.getElementById('inputPasporTgl').value,
            pasporExp: document.getElementById('inputPasporExp').value,
            grupKeluarga: document.getElementById('inputGrupKeluarga').value,
            reqKhusus: document.getElementById('inputReqKhusus').value,

            // Berkas Cloudinary URL
            urlKtp: resKtp,
            urlKk: resKk,
            urlNikah: resNikah,
            urlLahir: resLahir,
            urlFoto: resFoto,
            urlPaspor: resPaspor,

            status: "Menunggu Verifikasi",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Simpan ke Firestore
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
    
    document.getElementById('editGrupKeluarga').value = jm.grupKeluarga || '';
    document.getElementById('editReqKhusus').value = jm.reqKhusus || 'Tidak Ada';

    const selectPaket = document.getElementById('editPaket');
    selectPaket.innerHTML = '<option value="">-- Memuat Paket... --</option>';
    db.collection("paket").where("status", "==", "Aktif").get().then((snapshot) => {
        let options = '';
        snapshot.forEach(doc => {
            const isSelected = (doc.data().nama === jm.paket) ? 'selected' : '';
            options += `<option value="${doc.data().nama}" ${isSelected}>${doc.data().nama} (${doc.data().durasi} Hari)</option>`;
        });
        selectPaket.innerHTML = options;
    });

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditJemaah'));
    modal.show();
}

async function submitEditJemaah(event) {
    event.preventDefault();
    const btn = document.getElementById('btnUpdateJemaah');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';
    btn.disabled = true;

    try {
        const noReg = document.getElementById('editReg').value;
        const payloadData = {
            paket: document.getElementById('editPaket').value,
            nama: document.getElementById('editNama').value,
            nik: document.getElementById('editNik').value,
            tempatLahir: document.getElementById('editTmpLahir').value,
            tglLahir: document.getElementById('editTglLahir').value,
            jk: document.getElementById('editJk').value,
            alamat: document.getElementById('editAlamat').value,
            kota: document.getElementById('editKota').value,
            provinsi: document.getElementById('editProvinsi').value,
            wa: document.getElementById('editWa').value,
            email: document.getElementById('editEmail').value,
            mahramNama: document.getElementById('editMahramNama').value,
            mahramHub: document.getElementById('editMahramHub').value,
            pasporNo: document.getElementById('editPasporNo').value,
            pasporTempat: document.getElementById('editPasporTempat').value,
            pasporTgl: document.getElementById('editPasporTgl').value,
            pasporExp: document.getElementById('editPasporExp').value,
            daruratNama: document.getElementById('editDaruratNama').value,
            daruratHub: document.getElementById('editDaruratHub').value,
            daruratHp: document.getElementById('editDaruratHp').value,
            grupKeluarga: document.getElementById('editGrupKeluarga').value,
            reqKhusus: document.getElementById('editReqKhusus').value
        };

        await db.collection("jemaah").doc(noReg).update(payloadData);
        showCustomAlert("Data jemaah berhasil diperbarui!", "success");
        loadDataJemaah(); 
        
        bootstrap.Modal.getInstance(document.getElementById('modalEditJemaah')).hide();
    } catch (error) {
        showCustomAlert("Gagal menyimpan: " + error.message, "error");
    } finally {
        btn.innerHTML = '<i class="bi bi-save"></i> Simpan Perubahan Data';
        btn.disabled = false;
    }
}

// ==========================================
// FUNGSI UPDATE BERKAS DARI MODAL DETAIL
// ==========================================
async function prosesUpdateBerkas(jenis) {
    const fileInput = document.getElementById(`updFile${jenis}`);
    if (fileInput.files.length === 0) return;

    const noReg = document.getElementById('detNoReg').innerText;
    
    // Tampilkan notifikasi loading tanpa menutup modal
    Swal.fire({
        title: 'Mengupload Berkas...',
        html: `Silakan tunggu, sedang memperbarui file ${jenis}.`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const urlFile = await uploadKeCloudinary(fileInput.files[0]);
        let updateData = {};
        updateData[`url${jenis}`] = urlFile; // Misalnya jadi urlKtp, urlKk

        await db.collection("jemaah").doc(noReg).update(updateData);
        
        // Update badge secara real-time
        document.getElementById(`badge${jenis}`).innerHTML = '<span class="badge bg-success">Sudah Ada</span>';
        
        showCustomAlert(`Berkas ${jenis} berhasil diperbarui!`, "success");
        loadDataJemaah(); // Segarkan tabel di belakang layar
    } catch (error) {
        showCustomAlert(`Gagal upload berkas: ${error.message}`, "error");
    } finally {
        fileInput.value = ''; // Kosongkan kembali input
    }
}

// ==========================================
// FUNGSI CETAK BUKTI PENDAFTARAN (PDF / KERTAS)
// ==========================================
function cetakBuktiPendaftaran(jm) {
    const tglDaftar = jm.createdAt && jm.createdAt.seconds 
        ? new Date(jm.createdAt.seconds * 1000).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'}) 
        : '-';

    // Buka tab baru kosong
    const printWindow = window.open('', '_blank');
    
    // Tulis struktur HTML untuk kertas cetak
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
                // Otomatis memunculkan dialog print setelah halaman selesai dimuat
                window.onload = function() {
                    window.print();
                    // Opsional: Tutup tab otomatis setelah ngeprint
                    // window.onafterprint = function() { window.close(); } 
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}