// js/modules/paket.js

function loadDataPaket() {
    const tbody = document.getElementById('tabel-paket-body');
    if (!tbody) return;
    
    // Hancurkan DataTables lama jika sedang aktif (wajib untuk SPA)
    if ($.fn.DataTable.isDataTable('#tabel-paket')) {
        $('#tabel-paket').DataTable().destroy();
    }

    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span> Memuat data paket...</td></tr>`;

    db.collection("paket").orderBy("nama", "asc").get().then((querySnapshot) => {
        tbody.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const p = doc.data();
            const id = doc.id;
            
            let hargaRp = new Intl.NumberFormat('id-ID').format(p.harga || 0);
            let badgeStatus = p.status === 'Aktif' ? 'bg-success' : 'bg-secondary';
            const pktJSON = encodeURIComponent(JSON.stringify({id: id, ...p}));
            
            const row = `
              <tr>
                <td class="ps-4 fw-bold text-primary">${p.nama}</td>
                <td>${p.durasi} Hari</td>
                <td>Rp ${hargaRp}</td>
                <td>${p.kuota}</td>
                <td><span class="badge ${badgeStatus}">${p.status}</span></td>
                <td class="text-center">
                  <button class="btn btn-sm btn-warning text-dark me-1" onclick="editPaket('${pktJSON}')">
                    <i class="bi bi-pencil-square"></i> 
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="hapusDataPaket('${id}')">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Bangkitkan DataTables dengan Bahasa Indonesia
        $('#tabel-paket').DataTable({
            language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/id.json' },
            pageLength: 10,
            destroy: true
        });

    }).catch((error) => {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Gagal memuat: ${error.message}</td></tr>`;
    });
}

// Fungsi membuka modal tambah paket
function bukaModalPaket() {
    // Kita buat modalnya secara dinamis dengan SweetAlert atau Bootstrap Modal HTML biasa
    // Agar rapi, pastikan kode HTML Modal Paket dari file lama Anda dipindahkan ke bawah div subview-paket di index.html
    document.getElementById('formPaket').reset();
    document.getElementById('pktId').value = ""; 
    document.getElementById('modalPktTitle').innerText = "Tambah Paket Baru";
    
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPaket'));
    modal.show();
}

// Fungsi Edit
function editPaket(encodedJSON) {
    const p = JSON.parse(decodeURIComponent(encodedJSON));
    document.getElementById('formPaket').reset();
    
    document.getElementById('pktId').value = p.id;
    document.getElementById('modalPktTitle').innerText = "Edit Paket";
    document.getElementById('pktNama').value = p.nama;
    document.getElementById('pktDurasi').value = p.durasi;
    document.getElementById('pktKuota').value = p.kuota;
    document.getElementById('pktHarga').value = p.harga;
    document.getElementById('pktStatus').value = p.status;
    
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPaket'));
    modal.show();
}

// Fungsi Simpan (Tambah / Update ke Firestore)
function submitPaket(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSimpanPaket');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';
    btn.disabled = true;
    
    const id = document.getElementById('pktId').value;
    const dataPaket = {
        nama: document.getElementById('pktNama').value,
        durasi: parseInt(document.getElementById('pktDurasi').value),
        kuota: parseInt(document.getElementById('pktKuota').value),
        harga: parseInt(document.getElementById('pktHarga').value),
        status: document.getElementById('pktStatus').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (id) {
        // Mode Update
        db.collection("paket").doc(id).update(dataPaket).then(() => {
            showCustomAlert("Paket berhasil diperbarui!", "success");
            loadDataPaket();
            bootstrap.Modal.getInstance(document.getElementById('modalPaket')).hide();
        }).catch(err => showCustomAlert(err.message, "error")).finally(() => {
            btn.innerHTML = 'Simpan Paket'; btn.disabled = false;
        });
    } else {
        // Mode Tambah Baru
        db.collection("paket").add(dataPaket).then(() => {
            showCustomAlert("Paket baru berhasil ditambahkan!", "success");
            loadDataPaket();
            bootstrap.Modal.getInstance(document.getElementById('modalPaket')).hide();
        }).catch(err => showCustomAlert(err.message, "error")).finally(() => {
            btn.innerHTML = 'Simpan Paket'; btn.disabled = false;
        });
    }
}

function hapusDataPaket(id) {
    if (confirm("Yakin ingin menghapus paket ini?")) {
        db.collection("paket").doc(id).delete().then(() => {
            showCustomAlert("Paket berhasil dihapus.", "success");
            loadDataPaket();
        }).catch(err => showCustomAlert(err.message, "error"));
    }
}