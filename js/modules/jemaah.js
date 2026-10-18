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
                      <button class="btn btn-sm btn-outline-primary me-1 shadow-sm" title="Detail Jemaah" onclick="lihatDetailJemaah('${jmJSON}')">
                        <i class="bi bi-search"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger shadow-sm" onclick="hapusJemaah('${noReg}')">
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
// FUNGSI UNTUK MEMBUKA MODAL DETAIL
// ==========================================
function lihatDetailJemaah(encodedJSON) {
    const jm = JSON.parse(decodeURIComponent(encodedJSON));
    
    document.getElementById('detReg').innerText = jm.id;
    document.getElementById('detNama').innerText = jm.nama || '-';
    document.getElementById('detNik').innerText = jm.nik || '-';
    document.getElementById('detPaket').innerText = jm.paket || '-';
    
    let badgeColor = 'bg-secondary';
    if (jm.status === 'Menunggu Verifikasi') badgeColor = 'bg-warning text-dark';
    else if (jm.status === 'Siap Berangkat') badgeColor = 'bg-success';
    document.getElementById('detStatus').innerHTML = `<span class="badge ${badgeColor}">${jm.status || '-'}</span>`;
    
    // Setel Link Dokumen
    const btnKtp = document.getElementById('detLinkKtp');
    const btnKk = document.getElementById('detLinkKk');
    
    if (jm.urlKtp) { 
        btnKtp.href = jm.urlKtp; 
        btnKtp.classList.remove('disabled'); 
    } else { 
        btnKtp.removeAttribute('href'); 
        btnKtp.classList.add('disabled'); 
    }
    
    if (jm.urlKk) { 
        btnKk.href = jm.urlKk; 
        btnKk.classList.remove('disabled'); 
    } else { 
        btnKk.removeAttribute('href'); 
        btnKk.classList.add('disabled'); 
    }
    
    // Setel aksi Tombol Edit
    const btnEdit = document.getElementById('btnEditDariDetail');
    btnEdit.onclick = function() {
        // Tutup modal detail
        bootstrap.Modal.getInstance(document.getElementById('modalDetailJemaah')).hide();
        // Nanti kita akan buat fungsi bukaModalEditJemaah(jm) di tahap selanjutnya
        showCustomAlert("Fungsi Edit akan segera kita buat di tahap selanjutnya!", "info");
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
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan & Upload...';
    btn.disabled = true;

    try {
        const inputKtp = document.getElementById('fileKtp');
        const inputKk = document.getElementById('fileKk');
        
        let urlKtp = "";
        let urlKk = "";

        if (inputKtp && inputKtp.files.length > 0) urlKtp = await uploadKeCloudinary(inputKtp.files[0]);
        if (inputKk && inputKk.files.length > 0) urlKk = await uploadKeCloudinary(inputKk.files[0]);

        const date = new Date();
        const yy = date.getFullYear().toString().slice(-2);
        const mm = ("0" + (date.getMonth() + 1)).slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);
        const noReg = `REG-${yy}${mm}-${random}`;

        await db.collection("jemaah").doc(noReg).set({
            nama: document.getElementById('inputNama').value,
            nik: document.getElementById('inputNik').value,
            paket: document.getElementById('inputPaket').value,
            urlKtp: urlKtp || "",
            urlKk: urlKk || "",
            status: "Menunggu Verifikasi",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

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