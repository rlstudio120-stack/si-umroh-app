// js/modules/jemaah.js

// Fungsi memuat data Jemaah ke tabel
function loadDataJemaah() {
    const tbody = document.getElementById('tabel-jemaah-body');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span> Memuat data jemaah...</td></tr>`;

    // Tarik data dari koleksi 'jemaah' diurutkan berdasarkan waktu pendaftaran terbaru
    db.collection("jemaah").orderBy("createdAt", "desc").get().then((querySnapshot) => {
        tbody.innerHTML = '';
        
        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada data jemaah.</td></tr>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const jm = doc.data();
            const noReg = doc.id; // Kita jadikan No. Registrasi sebagai ID Dokumen
            
            let badgeColor = 'bg-secondary';
            if (jm.status === 'Menunggu Verifikasi') badgeColor = 'bg-warning text-dark';
            else if (jm.status === 'Siap Berangkat') badgeColor = 'bg-success';
            
            const row = `
              <tr>
                <td class="ps-4 fw-bold text-primary">${noReg}</td>
                <td class="fw-bold">${jm.nama}</td>
                <td>${jm.paket}</td>
                <td><span class="badge ${badgeColor}">${jm.status}</span></td>
                <td class="text-center">
                  <button class="btn btn-sm btn-danger" onclick="hapusJemaah('${noReg}')">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }).catch((error) => {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Gagal memuat: ${error.message}</td></tr>`;
    });
}

function bukaModalTambahJemaah() {
    document.getElementById('formTambahJemaah').reset();
    
    // Tarik daftar paket aktif dari Firestore ke dropdown
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

// Proses Eksekusi Simpan & Upload Pendaftaran Baru
async function submitJemaah(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSimpanJemaah');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan & Upload...';
    btn.disabled = true;

    try {
        // 1. Ambil file fisik dari input HTML (Contoh KTP dan KK, sesuaikan ID-nya dengan form Anda)
        const inputKtp = document.getElementById('fileKtp');
        const inputKk = document.getElementById('fileKk');
        
        let urlKtp = "";
        let urlKk = "";

        // 2. Upload ke Cloudinary secara asinkron jika ada file yang dipilih
        if (inputKtp && inputKtp.files.length > 0) {
            urlKtp = await uploadKeCloudinary(inputKtp.files[0]);
        }
        if (inputKk && inputKk.files.length > 0) {
            urlKk = await uploadKeCloudinary(inputKk.files[0]);
        }

        // 3. Generate Nomor Registrasi Unik (Format: REG-YYMM-XXXX)
        const date = new Date();
        const yy = date.getFullYear().toString().slice(-2);
        const mm = ("0" + (date.getMonth() + 1)).slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);
        const noReg = `REG-${yy}${mm}-${random}`;

        // 4. Simpan semua data teks dan URL Cloudinary ke Firestore
        await db.collection("jemaah").doc(noReg).set({
            nama: document.getElementById('inputNama').value,
            nik: document.getElementById('inputNik').value,
            paket: document.getElementById('inputPaket').value,
            // ... (Tambahkan field lain seperti hp, alamat, dll sesuai kebutuhan) ...
            urlKtp: urlKtp || "",
            urlKk: urlKk || "",
            status: "Menunggu Verifikasi",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showCustomAlert(`Pendaftaran berhasil!\nNomor Registrasi: ${noReg}`, "success", "Berhasil");
        loadDataJemaah(); // Refresh tabel
        
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
    if (confirm(`Yakin ingin menghapus data jemaah ${noReg}?`)) {
        db.collection("jemaah").doc(noReg).delete().then(() => {
            showCustomAlert("Data jemaah berhasil dihapus.", "success");
            loadDataJemaah();
        }).catch(err => showCustomAlert(err.message, "error"));
    }
}