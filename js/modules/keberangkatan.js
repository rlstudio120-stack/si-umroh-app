// js/modules/keberangkatan.js

function loadDataJadwal() {
    const tbody = document.getElementById('tbody-jadwal');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Memuat data...</td></tr>';
    
    db.collection("keberangkatan").orderBy("tglBerangkat", "desc").get().then((snapshot) => {
        let html = '';
        if (snapshot.empty) {
            html = '<tr><td colspan="6" class="text-center text-muted py-4">Belum ada jadwal keberangkatan.</td></tr>';
        } else {
            snapshot.forEach((doc) => {
                const jdw = doc.data();
                jdw.docId = doc.id;
                
                // Format Tanggal (Contoh: 08 Oct 2026)
                const tglBerangkat = new Date(jdw.tglBerangkat).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'});
                const encodedData = encodeURIComponent(JSON.stringify(jdw));
                
                html += `
                <tr>
                    <td class="fw-bold text-primary align-middle">${jdw.idJadwal}</td>
                    <td class="align-middle"><span class="badge bg-dark">${jdw.paket}</span></td>
                    <td class="align-middle fw-bold">${tglBerangkat}</td>
                    <td class="align-middle">${jdw.pesawat || '-'}</td>
                    <td class="align-middle">${jdw.tourLeader || '-'}</td>
                    <td class="text-center align-middle whitespace-nowrap">
                        <button class="btn btn-outline-success btn-sm me-1 shadow-sm" onclick="bukaManifest('${jdw.idJadwal}', '${jdw.paket}', '${tglBerangkat}')">
                            <i class="bi bi-people me-1"></i>Manifest
                        </button>
                        <button class="btn btn-outline-primary btn-sm me-1 shadow-sm" onclick="bukaRooming('${jdw.idJadwal}', '${jdw.paket}')"><i class="bi bi-door-open me-1"></i>Rooming</button>
                        <button class="btn btn-outline-warning btn-sm text-dark me-1 shadow-sm" onclick="bukaModalEditJadwal('${encodedData}')"><i class="bi bi-pencil me-1"></i>Edit</button>
                        <button class="btn btn-outline-danger btn-sm shadow-sm" onclick="hapusJadwal('${jdw.docId}', '${jdw.idJadwal}')"><i class="bi bi-trash me-1"></i>Hapus</button>
                    </td>
                </tr>`;
            });
        }
        tbody.innerHTML = html;
    }).catch(err => {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Gagal memuat: ${err.message}</td></tr>`;
    });
}

function muatPilihanPaket(paketTerpilih = '') {
    const select = document.getElementById('jadwal-paket');
    select.innerHTML = '<option value="">-- Memuat Paket... --</option>';
    
    db.collection("paket").where("status", "==", "Aktif").get().then((snapshot) => {
        let options = '<option value="">-- Pilih Paket Umroh --</option>';
        snapshot.forEach(doc => {
            const nama = doc.data().nama;
            const selected = (nama === paketTerpilih) ? 'selected' : '';
            options += `<option value="${nama}" ${selected}>${nama}</option>`;
        });
        select.innerHTML = options;
    });
}

function bukaModalTambahJadwal() {
    document.getElementById('formJadwal').reset();
    document.getElementById('jadwal-id-doc').value = '';
    document.getElementById('modalJadwalTitle').innerText = 'Tambah Jadwal Baru';
    muatPilihanPaket();
    new bootstrap.Modal(document.getElementById('modalJadwal')).show();
}

function bukaModalEditJadwal(encodedData) {
    const jdw = JSON.parse(decodeURIComponent(encodedData));
    document.getElementById('jadwal-id-doc').value = jdw.docId;
    document.getElementById('jadwal-id-tampil').value = jdw.idJadwal;
    document.getElementById('jadwal-tgl-berangkat').value = jdw.tglBerangkat;
    document.getElementById('jadwal-tgl-pulang').value = jdw.tglPulang;
    document.getElementById('jadwal-pesawat').value = jdw.pesawat;
    document.getElementById('jadwal-tl').value = jdw.tourLeader;
    document.getElementById('jadwal-muthawif').value = jdw.muthawif;
    
    document.getElementById('modalJadwalTitle').innerText = 'Edit Jadwal';
    muatPilihanPaket(jdw.paket);
    new bootstrap.Modal(document.getElementById('modalJadwal')).show();
}

function submitJadwal(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSimpanJadwal');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';
    btn.disabled = true;
    
    const docId = document.getElementById('jadwal-id-doc').value;
    const tglBerangkat = document.getElementById('jadwal-tgl-berangkat').value; // Format: YYYY-MM-DD
    
    // Auto-generate ID Jadwal (seperti DEP-202607-001) jika baru
    let idJadwal = document.getElementById('jadwal-id-tampil').value;
    if (!idJadwal) {
        const dateObj = new Date(tglBerangkat);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const randomStr = Math.floor(100 + Math.random() * 900);
        idJadwal = `DEP-${yyyy}${mm}-${randomStr}`;
    }
    
    const payload = {
        idJadwal: idJadwal,
        paket: document.getElementById('jadwal-paket').value,
        tglBerangkat: tglBerangkat,
        tglPulang: document.getElementById('jadwal-tgl-pulang').value,
        pesawat: document.getElementById('jadwal-pesawat').value,
        tourLeader: document.getElementById('jadwal-tl').value,
        muthawif: document.getElementById('jadwal-muthawif').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    let proses = docId ? db.collection("keberangkatan").doc(docId).update(payload) 
                       : (payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(), db.collection("keberangkatan").add(payload));
    
    proses.then(() => {
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Jadwal berhasil disimpan.', timer: 1500, showConfirmButton: false });
        bootstrap.Modal.getInstance(document.getElementById('modalJadwal')).hide();
        loadDataJadwal();
    }).catch(err => Swal.fire('Gagal', err.message, 'error'))
      .finally(() => { btn.innerHTML = 'Simpan Jadwal'; btn.disabled = false; });
}

function hapusJadwal(docId, idJadwal) {
    Swal.fire({
        title: 'Hapus Jadwal?', text: `Yakin menghapus jadwal ${idJadwal}? Data manifest dan rooming yang terhubung bisa terpengaruh.`,
        icon: 'warning', showCancelButton: true, confirmButtonText: 'Hapus'
    }).then((result) => {
        if (result.isConfirmed) {
            db.collection("keberangkatan").doc(docId).delete().then(() => loadDataJadwal());
        }
    });
}

// ==========================================
// MANIFEST JEMAAH (OTOMATIS BERDASARKAN PAKET)
// ==========================================
let aktifIdJadwal = '';
let aktifPaket = ''; // Tambahan: Simpan nama paket yang sedang aktif

function bukaManifest(idJadwal, paket, tglBerangkat) {
    aktifIdJadwal = idJadwal;
    aktifPaket = paket; // Simpan ke memori
    
    document.getElementById('manifest-id-jadwal').innerText = `Jadwal: ${idJadwal}`;
    document.getElementById('manifest-info-paket').innerHTML = `Paket: <span class="fw-bold text-primary">${paket}</span> | Berangkat: <span class="fw-bold text-danger">${tglBerangkat}</span>`;
    
    loadDataManifest();
    new bootstrap.Modal(document.getElementById('modalManifest')).show();
}

function loadDataManifest() {
    const tbody = document.getElementById('tbody-manifest');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-success spinner-border-sm me-2"></div>Menarik data jemaah otomatis...</td></tr>';
    
    // PERBAIKAN: Cari berdasarkan "paket", BUKAN "idJadwal"
    db.collection("jemaah").where("paket", "==", aktifPaket).get().then((snapshot) => {
        let html = '';
        let jumlahJemaah = 0;

        snapshot.forEach((doc) => {
            const jm = doc.data();
            jm.id = doc.id;
            
            // FILTER: Hanya masukkan jemaah yang dokumennya sudah Valid / Siap Berangkat
            if (jm.status === 'Siap Berangkat' || jm.status === 'Disetujui') {
                jumlahJemaah++;
                const lp = (jm.jk === 'Laki-laki') ? 'L' : (jm.jk === 'Perempuan' ? 'P' : '-');
                
                html += `
                <tr>
                    <td class="fw-bold text-primary">${jm.id}</td>
                    <td class="fw-bold text-dark">${jm.nama || '-'}</td>
                    <td>${lp}</td>
                    <td>${jm.wa || '-'}</td>
                    <td><span class="badge bg-success">Siap Berangkat</span></td>
                </tr>`;
            }
        });
        
        if (jumlahJemaah === 0) {
            html = '<tr><td colspan="6" class="text-center text-muted py-4">Belum ada jemaah "Siap Berangkat" untuk paket ini.</td></tr>';
        }
        
        tbody.innerHTML = html;
    }).catch(err => {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Gagal memuat: ${err.message}</td></tr>`;
    });
}

// ==========================================
// MANAJEMEN ROOMING & ALGORITMA KECERDASAN
// ==========================================
let roomingIdJadwal = '';
let roomingPaket = ''; 
let counterKamar = 1;
let jemaahMentah = []; // Menyimpan data mentah untuk fitur Reset ke Auto Rooming

function bukaRooming(idJadwal, paket) {
    roomingIdJadwal = idJadwal;
    roomingPaket = paket;
    
    document.getElementById('rooming-paket-info').innerText = `Paket: ${paket}`;
    document.getElementById('rooming-jadwal-info').innerText = `ID Keberangkatan: ${idJadwal}`;
    
    new bootstrap.Modal(document.getElementById('modalRooming')).show();
    loadDataRooming();
}

function loadDataRooming() {
    const areaKamar = document.getElementById('area-kamar');
    areaKamar.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Menjalankan Algoritma Auto-Rooming & Menyusun Kamar...</p></div>';
    
    db.collection("jemaah").where("paket", "==", roomingPaket).get().then((snapshot) => {
        jemaahMentah = [];
        snapshot.forEach((doc) => {
            const jm = doc.data();
            jm.id = doc.id;
            if (jm.status === 'Siap Berangkat' || jm.status === 'Disetujui') {
                jemaahMentah.push(jm);
            }
        });
        
        renderFormasiKamar(jemaahMentah);
    }).catch(err => {
        areaKamar.innerHTML = `<div class="col-12 text-center text-danger">Gagal memuat: ${err.message}</div>`;
    });
}

// MESIN PENDUKUNG KEPUTUSAN (AUTO ROOMING & RENDER)
function renderFormasiKamar(listJemaah) {
    let dataKamar = { 'KMR-BELUM': [] };
    let jemaahTanpaKamar = [];
    let maxKamarUrut = 0;

    // 1. Petakan Jemaah yang Sudah Disimpan Kamarnya
    listJemaah.forEach(jm => {
        if (jm.noKamar && jm.noKamar !== 'KMR-BELUM') {
            if (!dataKamar[jm.noKamar]) dataKamar[jm.noKamar] = [];
            dataKamar[jm.noKamar].push(jm);

            if (jm.noKamar.startsWith('KMR-') && !jm.noKamar.includes('PVT') && !jm.noKamar.includes('GRP')) {
                let urut = parseInt(jm.noKamar.replace('KMR-', ''));
                if (!isNaN(urut) && urut > maxKamarUrut) maxKamarUrut = urut;
            }
        } else {
            jemaahTanpaKamar.push(jm);
        }
    });

    counterKamar = maxKamarUrut + 1;

    // 2. JALANKAN ALGORITMA PENYORTIRAN JIKA ADA YANG BELUM DAPAT KAMAR
    if (jemaahTanpaKamar.length > 0) {
        let pvtCount = 1, grpCount = 1, lCount = 1, pCount = 1;

        // ===========================================
        // A. PENCOCOKAN SILANG PRIVATE ROOM (Suami-Istri)
        // ===========================================
        let sisa1 = [];
        let jemaahPrivate = [];
        
        jemaahTanpaKamar.forEach(jm => {
            let req = (jm.requestKamar || jm.reqKhusus || '').toString().toLowerCase();
            if (req.includes('private')) {
                jemaahPrivate.push(jm);
            } else {
                sisa1.push(jm);
            }
        });

        while(jemaahPrivate.length > 0) {
            let jm1 = jemaahPrivate.shift(); 
            let kamarPvt = [jm1];
            
            let i = 0;
            while(i < jemaahPrivate.length) {
                let jm2 = jemaahPrivate[i]; 
                let cocok = false;
                
                let m1 = (jm1.mahramNama || '').toLowerCase().trim();
                let n1 = (jm1.nama || '').toLowerCase().trim();
                let m2 = (jm2.mahramNama || '').toLowerCase().trim();
                let n2 = (jm2.nama || '').toLowerCase().trim();
                
                // Cek silang: Nama jemaah 1 mirip dengan Mahram jemaah 2 ATAU sebaliknya
                if (m1 !== '' && n2.includes(m1)) cocok = true;
                if (m2 !== '' && n1.includes(m2)) cocok = true;
                if (m1 !== '' && m2 !== '' && m1 === m2) cocok = true; // Mahram sama

                let g1 = (jm1.grup || jm1.grupKeluarga || '').toLowerCase().trim();
                let g2 = (jm2.grup || jm2.grupKeluarga || '').toLowerCase().trim();
                if (g1 !== '' && g2 !== '' && g1 === g2) cocok = true;

                if (cocok) {
                    kamarPvt.push(jm2); 
                    jemaahPrivate.splice(i, 1); 
                } else {
                    i++;
                }
            }
            dataKamar['KMR-PVT-' + String(pvtCount++).padStart(3, '0')] = kamarPvt;
        }

        // ===========================================
        // B. GRUP KELUARGA (Rombongan Besar)
        // ===========================================
        let sisa2 = [];
        let grpGroups = {};
        sisa1.forEach(jm => {
            let req = (jm.requestKamar || jm.reqKhusus || '').toString().toLowerCase();
            let namaGrup = (jm.grup || jm.grupKeluarga || '').toString().trim();

            if (req.includes('grup') && namaGrup !== '') {
                if (!grpGroups[namaGrup]) grpGroups[namaGrup] = [];
                grpGroups[namaGrup].push(jm);
            } else {
                sisa2.push(jm);
            }
        });
        for (let k in grpGroups) {
            dataKamar['KMR-GRP-' + String(grpCount++).padStart(3, '0')] = grpGroups[k];
        }

        // ===========================================
        // C & D. SISA REGULER (Pisah Laki-laki / Perempuan isi 4)
        // ===========================================
        let laki = sisa2.filter(jm => jm.jk === 'Laki-laki');
        while (laki.length > 0) {
            dataKamar['KMR-L-' + String(lCount++).padStart(3, '0')] = laki.splice(0, 4);
        }

        let perempuan = sisa2.filter(jm => jm.jk === 'Perempuan');
        while (perempuan.length > 0) {
            dataKamar['KMR-P-' + String(pCount++).padStart(3, '0')] = perempuan.splice(0, 4);
        }
    }

    // 3. CETAK KE LAYAR (HTML)
    let htmlArea = '';
    if (dataKamar['KMR-BELUM']) {
        htmlArea += renderKotakKamar('KMR-BELUM', 'BELUM DIATUR', dataKamar['KMR-BELUM']);
        delete dataKamar['KMR-BELUM'];
    }

    let sortedKeys = Object.keys(dataKamar).sort();
    sortedKeys.forEach(idKmr => {
        htmlArea += renderKotakKamar(idKmr, idKmr, dataKamar[idKmr]);
    });
    
    document.getElementById('area-kamar').innerHTML = htmlArea;
}

// FUNGSI PEMBUAT KOTAK KAMAR & KARTU JEMAAH (Sesuai Referensi Gambar)
function renderKotakKamar(idKamar, judulKamar, listJemaah) {
    let htmlKartu = '';
    let jumlah = listJemaah ? listJemaah.length : 0;
    
    // Tipe Kamar Berdasarkan Jumlah Anggota
    let tipeKamarText = '';
    if(jumlah === 2) tipeKamarText = ' (Double)';
    else if(jumlah === 3) tipeKamarText = ' (Triple)';
    else if(jumlah === 4) tipeKamarText = ' (Quad)';
    else if(jumlah > 4) tipeKamarText = ' (Quad+)';

    if (listJemaah && jumlah > 0) {
        listJemaah.forEach(jm => {
            const isLaki = (jm.jk === 'Laki-laki');
            const lp = isLaki ? 'Laki-laki' : (jm.jk === 'Perempuan' ? 'Perempuan' : '-');
            const ikonJk = isLaki ? '<i class="bi bi-gender-male text-secondary"></i>' : '<i class="bi bi-gender-female text-secondary"></i>';
            const umurText = jm.umur ? `${jm.umur} Thn` : '? Thn';
            
            // Garis pinggir kiri (Biru untuk Laki-laki, Merah untuk Perempuan)
            const borderKiri = isLaki ? 'border-primary' : 'border-danger';

            // Lencana Tambahan (Private / Grup Keluarga)
            let badges = '';
            if (jm.requestKamar === 'Private' || jm.tipeKamar === 'Private') {
                badges += `<span class="badge bg-warning text-dark me-1 shadow-sm mt-1">Private</span>`;
            }
            if (jm.grup) {
                badges += `<span class="badge bg-info text-dark shadow-sm mt-1">Grup: ${jm.grup}</span>`;
            }

            htmlKartu += `
            <div class="card mb-2 shadow-sm kartu-jemaah border-start border-4 ${borderKiri}" id="jemaah-${jm.id}" draggable="true" ondragstart="dragStart(event)" ondragend="dragEnd(event)" data-id="${jm.id}">
                <div class="card-body p-2" style="cursor: grab;">
                    <div class="fw-bold text-dark" style="font-size: 0.85rem;">${ikonJk} ${jm.nama}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${lp} | ${umurText}</div>
                    ${badges !== '' ? `<div>${badges}</div>` : ''}
                </div>
            </div>`;
        });
    } else if (idKamar === 'KMR-BELUM') {
        htmlKartu = '<div class="text-center py-4 text-muted small id-loading">Tidak ada jemaah tersisa.</div>';
    }
    
    // Warna Header (Hitam untuk kamar jadi, Abu-abu untuk Belum Diatur)
    const bgHeader = idKamar === 'KMR-BELUM' ? 'bg-secondary' : 'bg-dark';
    const badgeHeader = idKamar === 'KMR-BELUM' ? 'bg-light text-dark' : 'bg-danger text-white';

    return `
    <div class="col-md-3 mb-3">
        <div class="card border-dark h-100 shadow-sm" style="background-color: #f4f6f8;">
            <div class="card-header ${bgHeader} text-white d-flex justify-content-between align-items-center py-2 border-0">
                <span class="fw-bold"><i class="bi bi-door-closed me-1"></i>${judulKamar}</span>${idKamar !== 'KMR-BELUM' ? `<button class="btn btn-sm text-white ms-2 p-0 border-0 opacity-75 hover-opacity-100" onclick="hapusKamar('${idKamar}')" title="Hapus Kamar Kosong"><i class="bi bi-trash"></i></button>` : ''}
                <span class="badge ${badgeHeader} px-2 py-1" id="badge-${idKamar}">${jumlah} Org${tipeKamarText}</span>
            </div>
            <!-- DROPZONE -->
            <div class="card-body p-2 overflow-auto dropzone-kamar rounded-bottom" id="${idKamar}" style="min-height: 400px; max-height: 60vh;" ondragover="allowDrop(event)" ondragleave="dragLeave(event)" ondrop="drop(event)">
                ${htmlKartu}
            </div>
        </div>
    </div>`;
}

// ==========================================
// TOMBOL AKSI & RESET AUTO ROOMING
// ==========================================
function autoRooming() {
    Swal.fire({
        title: 'Reset ke Auto Rooming?',
        text: 'Formasi kamar saat ini akan diatur ulang berdasarkan preferensi Private, Grup, dan Jenis Kelamin. Lanjutkan?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Reset Otomatis!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            // Bersihkan data noKamar sementara lalu jalankan ulang algoritma
            let jemaahReset = jemaahMentah.map(jm => {
                let temp = {...jm};
                delete temp.noKamar;
                return temp;
            });
            renderFormasiKamar(jemaahReset);
            Swal.fire({ icon: 'success', title: 'Berhasil Direset!', text: 'Silakan klik Simpan Formasi jika susunan ini sudah pas.', timer: 2000, showConfirmButton: false });
        }
    });
}

function tambahKamarManual() {
    const areaKamar = document.getElementById('area-kamar');
    const idKamar = `KMR-${counterKamar.toString().padStart(3, '0')}`;
    counterKamar++;

    const div = document.createElement('div');
    div.className = 'col-md-3 mb-3';
    div.innerHTML = `
        <div class="card border-primary h-100 shadow-sm" style="background-color: #f4f6f8;">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center py-2 border-0">
                <button class="btn btn-sm text-white ms-2 p-0 border-0 opacity-75 hover-opacity-100" onclick="hapusKamar('${idKamar}')" title="Hapus Kamar Kosong"><i class="bi bi-trash"></i></button>
                <span class="badge bg-primary text-white px-2 py-1" id="badge-${idKamar}">0 Org</span>
            </div>
            <div class="card-body p-2 overflow-auto dropzone-kamar rounded-bottom" id="${idKamar}" style="min-height: 400px; max-height: 60vh;" ondragover="allowDrop(event)" ondragleave="dragLeave(event)" ondrop="drop(event)">
                <div class="text-center py-4 text-muted small">Kamar Kosong</div>
            </div>
        </div>
    `;
    areaKamar.appendChild(div);
}

// ==========================================
// MANAJEMEN ROOMING (SIMPAN KE FIREBASE)
// ==========================================
function simpanFormasiRooming() {
    const batch = db.batch(); 
    let totalUpdate = 0;

    const semuaKamar = document.querySelectorAll('.dropzone-kamar');

    semuaKamar.forEach(kamar => {
        const idKamar = kamar.id; 
        const listKartuJemaah = kamar.querySelectorAll('.kartu-jemaah');

        listKartuJemaah.forEach(kartu => {
            const idJemaah = kartu.getAttribute('data-id');
            const refJemaah = db.collection("jemaah").doc(idJemaah);

            if (idKamar === 'KMR-BELUM') {
                batch.update(refJemaah, { noKamar: firebase.firestore.FieldValue.delete() });
            } else {
                batch.update(refJemaah, { noKamar: idKamar });
            }
            totalUpdate++;
        });
    });

    if (totalUpdate === 0) {
        Swal.fire('Info', 'Tidak ada data jemaah untuk disimpan.', 'info');
        return;
    }

    Swal.fire({
        title: 'Menyimpan Formasi...',
        text: 'Mohon tunggu sebentar...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    batch.commit().then(() => {
        Swal.fire({ 
            icon: 'success', 
            title: 'Formasi Tersimpan!', 
            text: 'Pembagian kamar berhasil diperbarui di database.', 
            timer: 2000, 
            showConfirmButton: false 
        });
        loadDataRooming(); // Muat ulang data untuk menyegarkan memori
    }).catch(err => {
        Swal.fire('Gagal Menyimpan', err.message, 'error');
    });
}

// ==========================================
// MESIN DRAG AND DROP ROOMING
// ==========================================
function dragStart(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    setTimeout(() => ev.target.classList.add('opacity-50'), 0);
}

function dragEnd(ev) {
    ev.target.classList.remove('opacity-50');
    hitungUlangKamar(); 
}

function allowDrop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('bg-warning', 'bg-opacity-10'); 
}

function dragLeave(ev) {
    ev.currentTarget.classList.remove('bg-warning', 'bg-opacity-10');
}

function drop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('bg-warning', 'bg-opacity-10');
    
    const dataId = ev.dataTransfer.getData("text");
    const kartu = document.getElementById(dataId);
    
    const textLoading = ev.currentTarget.querySelector('.text-muted');
    if(textLoading) textLoading.remove();
    
    ev.currentTarget.appendChild(kartu);
    hitungUlangKamar();
}

function hitungUlangKamar() {
    const semuaKamar = document.querySelectorAll('.dropzone-kamar');
    semuaKamar.forEach(kamar => {
        const idBadge = 'badge-' + kamar.id;
        const jumlahKartu = kamar.querySelectorAll('.kartu-jemaah').length;
        
        let tipeKamarText = '';
        if(jumlahKartu === 2) tipeKamarText = ' (Double)';
        else if(jumlahKartu === 3) tipeKamarText = ' (Triple)';
        else if(jumlahKartu === 4) tipeKamarText = ' (Quad)';
        else if(jumlahKartu > 4) tipeKamarText = ' (Quad+)';

        const badge = document.getElementById(idBadge);
        if(badge) {
            badge.innerText = `${jumlahKartu} Org${tipeKamarText}`;
        }
    });
}

function hapusKamar(idKamar) {
    const kamar = document.getElementById(idKamar);
    if (!kamar) return;

    const jumlahJemaah = kamar.querySelectorAll('.kartu-jemaah').length;
    if (jumlahJemaah > 0) {
        Swal.fire('Tidak Bisa Dihapus', 'Kamar masih berisi jemaah. Harap pindahkan jemaah ke kamar lain atau ke kotak Belum Diatur terlebih dahulu.', 'warning');
        return;
    }

    // Menghapus elemen kolom pembungkus kamar dari layar
    kamar.closest('.col-md-3').remove();
}

// ==========================================
// SCRIPT INJEKSI DATA DUMMY (UNTUK UJI COBA)
// ==========================================
function injectDummyJemaah() {
    // Ganti nama paket ini sesuai dengan nama paket yang sedang Bapak tes!
    const targetPaket = "Paket Reguler Desember"; 
    
    Swal.fire({
        title: 'Menyuntikkan 40 Data...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const batch = db.batch();
    const namaDepanL = ['Ahmad', 'Budi', 'Candra', 'Dedi', 'Eko', 'Fajar', 'Gilang', 'Hasan', 'Iwan', 'Joko'];
    const namaDepanP = ['Ani', 'Bunga', 'Citra', 'Dina', 'Eka', 'Fitri', 'Gita', 'Hani', 'Irma', 'Jihan'];
    const namaBelakang = ['Santoso', 'Wijaya', 'Kusuma', 'Pratama', 'Putra', 'Putri', 'Sari', 'Lestari'];

    for(let i = 1; i <= 40; i++) {
        let isLaki = Math.random() > 0.5;
        let jk = isLaki ? 'Laki-laki' : 'Perempuan';
        let nama = (isLaki ? namaDepanL[Math.floor(Math.random()*namaDepanL.length)] : namaDepanP[Math.floor(Math.random()*namaDepanP.length)]) + ' ' + namaBelakang[Math.floor(Math.random()*namaBelakang.length)];
        let umur = Math.floor(Math.random() * 40) + 20; // Umur 20 - 59
        
        // Acak Preferensi
        let reqKamar = '';
        let grup = '';
        let rand = Math.random();
        if (rand < 0.15) { 
            reqKamar = 'Private'; // 15% kemungkinan Private
        } else if (rand < 0.40) { 
            grup = 'KEL-TEST-' + Math.floor(Math.random() * 3 + 1); // 25% kemungkinan Grup (KEL-TEST-1, 2, atau 3)
        }

        let idDummy = "DUMMY-" + Date.now().toString().slice(-4) + "-" + i;
        let ref = db.collection("jemaah").doc(idDummy);
        
        batch.set(ref, {
            nama: nama,
            jk: jk,
            umur: umur,
            wa: '0812' + Math.floor(10000000 + Math.random() * 90000000),
            paket: targetPaket,
            status: 'Siap Berangkat', // Status wajib agar masuk Rooming
            requestKamar: reqKamar,
            grup: grup,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    batch.commit().then(() => {
        Swal.fire('Berhasil!', `40 jemaah dummy berhasil dimasukkan ke ${targetPaket}. Silakan buka ulang menu Rooming.`, 'success');
    }).catch(err => {
        Swal.fire('Gagal', err.message, 'error');
    });
}