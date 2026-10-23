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
                
                // Format Tanggal
                const tglBerangkat = new Date(jdw.tglBerangkat).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'});
                const encodedData = encodeURIComponent(JSON.stringify(jdw));
                
                // TOMBOL AKSI BERUPA IKON SOLID + TOOLTIP BANTUAN
                html += `
                <tr>
                    <td class="fw-bold text-primary align-middle">${jdw.idJadwal}</td>
                    <td class="align-middle"><span class="badge bg-dark">${jdw.paket}</span></td>
                    <td class="align-middle fw-bold">${tglBerangkat}</td>
                    <td class="align-middle">${jdw.pesawat || '-'}</td>
                    <td class="align-middle">${jdw.tourLeader || '-'}</td>
                    <td class="text-center align-middle whitespace-nowrap">
                        <button class="btn btn-success btn-sm me-1 shadow-sm" onclick="bukaManifest('${jdw.idJadwal}', '${jdw.paket}', '${tglBerangkat}')" title="Manifest Jemaah">
                            <i class="bi bi-people"></i>
                        </button>
                        <button class="btn btn-primary btn-sm me-1 shadow-sm" onclick="bukaRooming('${jdw.idJadwal}', '${jdw.paket}')" title="Manajemen Rooming">
                            <i class="bi bi-door-open"></i>
                        </button>
                        <button class="btn btn-info btn-sm text-white me-1 shadow-sm" onclick="bukaBus('${jdw.idJadwal}', '${jdw.paket}')" title="Denah Kursi Bus">
                            <i class="bi bi-bus-front"></i>
                        </button>
                        <button class="btn btn-warning btn-sm text-dark me-1 shadow-sm" onclick="bukaModalEditJadwal('${encodedData}')" title="Edit Jadwal">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm shadow-sm" onclick="hapusJadwal('${jdw.docId}', '${jdw.idJadwal}')" title="Hapus Jadwal">
                            <i class="bi bi-trash"></i>
                        </button>
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
    
    // Fitur Baru: KMR-BELUM hanya dirender jika masih ada orang di dalamnya
    if (dataKamar['KMR-BELUM'] && dataKamar['KMR-BELUM'].length > 0) {
        htmlArea += renderKotakKamar('KMR-BELUM', 'BELUM DIATUR', dataKamar['KMR-BELUM']);
    }
    delete dataKamar['KMR-BELUM']; // Hapus agar tidak ikut ter-looping di bawah

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
            
            const borderKiri = isLaki ? 'border-primary' : 'border-danger';

            let badges = '';
            if (jm.requestKamar === 'Private' || jm.tipeKamar === 'Private') {
                badges += `<span class="badge bg-warning text-dark me-1 shadow-sm mt-1">Private</span>`;
            }
            if (jm.grup) {
                badges += `<span class="badge bg-info text-dark shadow-sm mt-1">Grup: ${jm.grup}</span>`;
            }

            // PERBAIKAN DRAG: Tambahan pointer-events:none dan user-select-none agar tampilan utuh
            htmlKartu += `
            <div class="card mb-2 shadow-sm kartu-jemaah border-start border-4 ${borderKiri}" id="jemaah-${jm.id}" draggable="true" ondragstart="dragStart(event)" ondragend="dragEnd(event)" data-id="${jm.id}">
                <div class="card-body p-2" style="cursor: grab; pointer-events: none; user-select: none;">
                    <div class="fw-bold text-dark" style="font-size: 0.85rem;">${ikonJk} ${jm.nama}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${lp} | ${umurText}</div>
                    ${badges !== '' ? `<div>${badges}</div>` : ''}
                </div>
            </div>`;
        });
    }
    
    const bgHeader = idKamar === 'KMR-BELUM' ? 'bg-secondary' : 'bg-dark';
    const badgeHeader = idKamar === 'KMR-BELUM' ? 'bg-light text-dark' : 'bg-danger text-white';
    
    // LOGIKA TONG SAMPAH: Defaultnya d-none (tersembunyi) jika kamar ada isinya
    const classTrash = (idKamar !== 'KMR-BELUM' && jumlah === 0) ? '' : 'd-none';
    const tombolTrash = idKamar !== 'KMR-BELUM' ? `<button class="btn btn-sm text-white ms-2 p-0 border-0 opacity-75 hover-opacity-100 btn-hapus-kamar ${classTrash}" onclick="hapusKamar('${idKamar}')" title="Hapus Kamar Kosong"><i class="bi bi-trash"></i></button>` : '';

    return `
    <div class="col-md-3 mb-3">
        <div class="card border-dark h-100 shadow-sm" style="background-color: #f4f6f8;">
            <div class="card-header ${bgHeader} text-white d-flex justify-content-between align-items-center py-2 border-0">
                <span class="fw-bold"><i class="bi bi-door-closed me-1"></i>${judulKamar}</span>${tombolTrash}
                <span class="badge ${badgeHeader} px-2 py-1" id="badge-${idKamar}">${jumlah} Org${tipeKamarText}</span>
            </div>
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
                <span class="fw-bold"><i class="bi bi-door-closed me-1"></i>${idKamar}</span>
                <button class="btn btn-sm text-white ms-2 p-0 border-0 opacity-75 hover-opacity-100 btn-hapus-kamar" onclick="hapusKamar('${idKamar}')" title="Hapus Kamar Kosong"><i class="bi bi-trash"></i></button>
                <span class="badge bg-primary text-white px-2 py-1" id="badge-${idKamar}">0 Org</span>
            </div>
            <div class="card-body p-2 overflow-auto dropzone-kamar rounded-bottom" id="${idKamar}" style="min-height: 400px; max-height: 60vh;" ondragover="allowDrop(event)" ondragleave="dragLeave(event)" ondrop="drop(event)">
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

// Opsional: perketat juga dragStart
function dragStart(ev) {
    const target = ev.target.closest('.kartu-jemaah');
    if (!target) return;
    ev.dataTransfer.setData("text", target.id);
    ev.dataTransfer.effectAllowed = "move"; 
    setTimeout(() => target.classList.add('opacity-50'), 0);
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
    
    // Pastikan selalu dijatuhkan di ruangan, bukan di atas jemaah lain
    const dropzone = ev.target.closest('.dropzone-kamar');
    if (!dropzone) {
        document.querySelectorAll('.dropzone-kamar').forEach(el => el.classList.remove('bg-warning', 'bg-opacity-10'));
        return; 
    }

    dropzone.classList.remove('bg-warning', 'bg-opacity-10');
    
    const dataId = ev.dataTransfer.getData("text");
    const kartu = document.getElementById(dataId);
    if (!kartu) return;
    
    const textLoading = dropzone.querySelector('.text-muted.id-loading');
    if(textLoading) textLoading.remove();
    
    dropzone.appendChild(kartu);
    hitungUlangKamar();
}

function hitungUlangKamar() {
    const semuaKamar = document.querySelectorAll('.dropzone-kamar');
    semuaKamar.forEach(kamar => {
        const idKamar = kamar.id;
        const idBadge = 'badge-' + idKamar;
        const jumlahKartu = kamar.querySelectorAll('.kartu-jemaah').length;
        
        let tipeKamarText = '';
        if(jumlahKartu === 2) tipeKamarText = ' (Double)';
        else if(jumlahKartu === 3) tipeKamarText = ' (Triple)';
        else if(jumlahKartu === 4) tipeKamarText = ' (Quad)';
        else if(jumlahKartu > 4) tipeKamarText = ' (Quad+)';

        const badge = document.getElementById(idBadge);
        if(badge) badge.innerText = `${jumlahKartu} Org${tipeKamarText}`;

        // MUNCUL/SEMBUNYIKAN TONG SAMPAH SAAT DIGESER
        if (idKamar !== 'KMR-BELUM') {
            const header = kamar.previousElementSibling;
            if (header) {
                const btnTrash = header.querySelector('.btn-hapus-kamar');
                if (btnTrash) {
                    if (jumlahKartu === 0) btnTrash.classList.remove('d-none'); // Muncul jika kosong
                    else btnTrash.classList.add('d-none'); // Hilang jika ada isi
                }
            }
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

// ==========================================
// HAPUS INJEKSI DATA DUMMY 
// ==========================================

async function hapusSeluruhDataJemaah() {
    const { value: text } = await Swal.fire({
        title: 'Peringatan Berbahaya!',
        text: 'Tindakan ini akan menghapus permanen SELURUH data Jemaah dan riwayat Transaksinya. Ketik "RESET" (huruf besar) untuk melanjutkan:',
        input: 'text',
        inputPlaceholder: 'Ketik RESET di sini...',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash me-1"></i> Ya, Hapus Semua!'
    });

    if (text === 'RESET') {
        Swal.fire({ 
            title: 'Sedang membersihkan database...', 
            allowOutsideClick: false, 
            didOpen: () => { Swal.showLoading(); }
        });
        
        try {
            const jemaahSnap = await db.collection("jemaah").get();
            let totalDihapus = 0;
            
            for (let doc of jemaahSnap.docs) {
                // 1. Hapus riwayat transaksi terlebih dahulu (sub-collection)
                const trxSnap = await doc.ref.collection("transaksi").get();
                for (let trxDoc of trxSnap.docs) {
                    await trxDoc.ref.delete();
                }
                // 2. Hapus data utama jemaahnya
                await doc.ref.delete();
                totalDihapus++;
            }
            
            Swal.fire({
                icon: 'success',
                title: 'Database Bersih!',
                text: `${totalDihapus} data jemaah beserta riwayat transaksinya telah dihapus permanen.`
            }).then(() => {
                // Refresh halaman agar angka dashboard kembali 0
                window.location.reload();
            });
            
        } catch (err) {
            Swal.fire('Gagal Menghapus', err.message, 'error');
        }
    } else if (text !== undefined) {
        Swal.fire('Dibatalkan', 'Kata kunci salah atau dibatalkan. Data Anda aman.', 'info');
    }
}

// ==========================================
// MANAJEMEN POSISI DUDUK BUS (45 KURSI)
// ==========================================
let busIdJadwal = '';
let busPaket = ''; 
let jemaahMentahBus = [];

// Tambahkan tombol akses di fungsi loadDataJadwal() (Opsional: Bapak bisa tambahkan tombol "Denah Bus" di tabel HTML jadwal nanti)
function bukaBus(idJadwal, paket) {
    busIdJadwal = idJadwal;
    busPaket = paket;
    document.getElementById('bus-paket-info').innerText = `Paket: ${paket}`;
    document.getElementById('bus-jadwal-info').innerText = `ID Keberangkatan: ${idJadwal}`;
    
    // Bangun visual kursi kosong dulu
    bangunGridBus();
    
    new bootstrap.Modal(document.getElementById('modalBus')).show();
    loadDataBus();
}

// 1. Membangun Visual 45 Kursi
function bangunGridBus() {
    const areaGrid = document.getElementById('area-grid-bus');
    let htmlGrid = '';

    // Baris 1 sampai 10 (2 Kanan - Lorong - 2 Kiri)
    for (let i = 1; i <= 10; i++) {
        htmlGrid += `
        <div class="d-flex justify-content-between mb-3 w-100" style="max-width: 600px;">
            <div class="d-flex gap-2 w-50 justify-content-start">
                ${renderSatuKursi(`${i}A`)}
                ${renderSatuKursi(`${i}B`)}
            </div>
            <div class="text-muted small d-flex align-items-center justify-content-center" style="width: 50px;">Lorong</div>
            <div class="d-flex gap-2 w-50 justify-content-end">
                ${renderSatuKursi(`${i}C`)}
                ${renderSatuKursi(`${i}D`)}
            </div>
        </div>`;
    }

    // Baris 11 (Paling Belakang - 5 Kursi Tersambung)
    htmlGrid += `
    <div class="d-flex justify-content-between mb-3 w-100 mt-2 pt-3 border-top border-dark" style="max-width: 600px;">
        ${renderSatuKursi('11A')} ${renderSatuKursi('11B')} ${renderSatuKursi('11C')} ${renderSatuKursi('11D')} ${renderSatuKursi('11E')}
    </div>`;

    areaGrid.innerHTML = htmlGrid;
}

function renderSatuKursi(idKursi) {
    return `
    <div class="card border-primary shadow-sm" style="width: 110px; height: 85px;">
        <div class="card-header bg-primary text-white py-1 px-2 fw-bold text-center" style="font-size: 0.75rem;">Kursi ${idKursi}</div>
        <div class="card-body p-1 bg-white dropzone-bus d-flex align-items-center justify-content-center" id="KRS-${idKursi}" ondragover="allowDropBus(event)" ondrop="dropBus(event)">
        </div>
    </div>`;
}

// 2. Load Data dan Terapkan ke Kursi
function loadDataBus() {
    db.collection("jemaah").where("paket", "==", busPaket).get().then((snapshot) => {
        jemaahMentahBus = [];
        snapshot.forEach((doc) => {
            const jm = doc.data();
            jm.id = doc.id;
            if (jm.status === 'Siap Berangkat' || jm.status === 'Disetujui') {
                jemaahMentahBus.push(jm);
            }
        });
        renderFormasiBus(jemaahMentahBus);
    });
}

function renderFormasiBus(listJemaah) {
    // Kosongkan semua kursi di layar
    document.querySelectorAll('.dropzone-bus').forEach(el => el.innerHTML = '');
    let htmlBelum = '';
    let jumlahBelum = 0;

    // Petakan Jemaah yang sudah punya kursi
    let jemaahTanpaKursi = [];
    listJemaah.forEach(jm => {
        if (jm.noKursi && document.getElementById(`KRS-${jm.noKursi}`)) {
            document.getElementById(`KRS-${jm.noKursi}`).innerHTML = buatKartuKecil(jm);
        } else {
            jemaahTanpaKursi.push(jm);
        }
    });

    // Jalankan Auto-Seating jika dipanggil (hanya memproses yang belum dapat kursi)
    if (jemaahTanpaKursi.length > 0 && autoSeatingActive) {
        let urutanKursi = [];
        for(let i=1; i<=10; i++) urutanKursi.push(`${i}A`, `${i}B`, `${i}C`, `${i}D`);
        urutanKursi.push('11A', '11B', '11C', '11D', '11E');

        // Filter kursi yang masih kosong di layar
        let kursiKosong = urutanKursi.filter(k => document.getElementById(`KRS-${k}`).innerHTML.trim() === '');

        // 1. Ekstrak Pasangan Mahram (Algoritma Pencocokan Silang)
        let pasangan = [];
        let sisa = [];
        
        while(jemaahTanpaKursi.length > 0) {
            let jm1 = jemaahTanpaKursi.shift();
            let ketemu = false;
            let m1 = (jm1.mahramNama || '').toLowerCase().trim();
            let n1 = (jm1.nama || '').toLowerCase().trim();

            for(let i=0; i<jemaahTanpaKursi.length; i++) {
                let jm2 = jemaahTanpaKursi[i];
                let m2 = (jm2.mahramNama || '').toLowerCase().trim();
                let n2 = (jm2.nama || '').toLowerCase().trim();

                if ((m1 !== '' && n2.includes(m1)) || (m2 !== '' && n1.includes(m2)) || (m1 !== '' && m2 !== '' && m1 === m2)) {
                    pasangan.push([jm1, jm2]);
                    jemaahTanpaKursi.splice(i, 1);
                    ketemu = true; break;
                }
            }
            if(!ketemu) sisa.push(jm1);
        }

        // 2. Tempatkan Pasangan di kursi bersebelahan (A&B atau C&D)
        pasangan.forEach(pas => {
            let placed = false;
            for(let i=0; i<kursiKosong.length - 1; i++) {
                let k1 = kursiKosong[i]; let k2 = kursiKosong[i+1];
                // Pastikan mereka di baris yang sama dan di sisi yang sama (A&B atau C&D)
                if (k1.charAt(0) === k2.charAt(0) && ((k1.includes('A') && k2.includes('B')) || (k1.includes('C') && k2.includes('D')))) {
                    document.getElementById(`KRS-${k1}`).innerHTML = buatKartuKecil(pas[0]);
                    document.getElementById(`KRS-${k2}`).innerHTML = buatKartuKecil(pas[1]);
                    kursiKosong.splice(i, 2);
                    placed = true; break;
                }
            }
            if(!placed) { sisa.push(pas[0]); sisa.push(pas[1]); } // Jika gagal cari berdampingan, jadikan single
        });

        // 3. Tempatkan sisa jemaah di kursi kosong sembarangan
        sisa.forEach(jm => {
            if (kursiKosong.length > 0) {
                let k = kursiKosong.shift();
                document.getElementById(`KRS-${k}`).innerHTML = buatKartuKecil(jm);
            } else {
                // Bus Penuh! Lempar ke kolom Belum Diatur
                htmlBelum += buatKartuKecil(jm);
                jumlahBelum++;
            }
        });
        autoSeatingActive = false; // Matikan flag setelah jalan
    } else {
        // Jika Auto-Seating tidak aktif, lempar ke kotak Belum Diatur
        jemaahTanpaKursi.forEach(jm => {
            htmlBelum += buatKartuKecil(jm);
            jumlahBelum++;
        });
    }

    document.getElementById('KRS-BELUM').innerHTML = htmlBelum;
    document.getElementById('badge-KRS-BELUM').innerText = `${jumlahBelum} Org`;
}

function buatKartuKecil(jm) {
    const isLaki = (jm.jk === 'Laki-laki');
    const bgWarna = isLaki ? 'bg-primary bg-opacity-10 border-primary' : 'bg-danger bg-opacity-10 border-danger';
    const fontWarna = isLaki ? 'text-primary' : 'text-danger';
    return `
    <div class="w-100 p-1 border rounded shadow-sm ${bgWarna} kartu-bus" id="bus-jm-${jm.id}" data-id="${jm.id}" draggable="true" ondragstart="dragStartBus(event)" style="cursor: grab; user-select: none;">
        <div class="fw-bold ${fontWarna}" style="font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${jm.nama}</div>
        <div class="text-muted" style="font-size: 0.6rem;">${isLaki ? 'L' : 'P'} | ${jm.umur || '?'} Thn</div>
    </div>`;
}

// 3. Mesin Drag & Drop Khusus Bus (Max 1 Orang per Kursi)
function dragStartBus(ev) {
    const target = ev.target.closest('.kartu-bus');
    if (!target) return;
    ev.dataTransfer.setData("text", target.id);
}

function allowDropBus(ev) {
    ev.preventDefault();
}

function dropBus(ev) {
    ev.preventDefault();
    const dropzone = ev.target.closest('.dropzone-bus');
    if (!dropzone) return;

    // RULE: Jika dijatuhkan ke kursi (bukan KRS-BELUM), pastikan kursi itu KOSONG
    if (dropzone.id !== 'KRS-BELUM' && dropzone.querySelectorAll('.kartu-bus').length >= 1) {
        Swal.fire({toast: true, position: 'top-end', icon: 'error', title: 'Kursi sudah terisi!', showConfirmButton: false, timer: 1500});
        return;
    }

    const dataId = ev.dataTransfer.getData("text");
    const kartu = document.getElementById(dataId);
    if (!kartu) return;

    dropzone.appendChild(kartu);
    
    // Update badge KRS-BELUM
    const jumlahBelum = document.getElementById('KRS-BELUM').querySelectorAll('.kartu-bus').length;
    document.getElementById('badge-KRS-BELUM').innerText = `${jumlahBelum} Org`;
}

// 4. Tombol Aksi
let autoSeatingActive = false;
function autoBus() {
    autoSeatingActive = true;
    
    // Reset data sementara
    let jemaahReset = jemaahMentahBus.map(jm => { let temp = {...jm}; delete temp.noKursi; return temp; });
    renderFormasiBus(jemaahReset);
}

function simpanFormasiBus() {
    const batch = db.batch(); 
    let totalUpdate = 0;

    document.querySelectorAll('.dropzone-bus').forEach(kursi => {
        const idKursiMentah = kursi.id; // Contoh: KRS-1A atau KRS-BELUM
        const idKursiDb = idKursiMentah === 'KRS-BELUM' ? null : idKursiMentah.replace('KRS-', '');
        
        kursi.querySelectorAll('.kartu-bus').forEach(kartu => {
            const idJemaah = kartu.getAttribute('data-id');
            const refJemaah = db.collection("jemaah").doc(idJemaah);

            if (!idKursiDb) batch.update(refJemaah, { noKursi: firebase.firestore.FieldValue.delete() });
            else batch.update(refJemaah, { noKursi: idKursiDb });
            totalUpdate++;
        });
    });

    if (totalUpdate === 0) return Swal.fire('Info', 'Tidak ada data untuk disimpan.', 'info');

    Swal.fire({ title: 'Menyimpan Posisi Duduk...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    batch.commit().then(() => {
        Swal.fire({ icon: 'success', title: 'Tersimpan!', timer: 1500, showConfirmButton: false });
        loadDataBus(); 
    }).catch(err => Swal.fire('Gagal Menyimpan', err.message, 'error'));
}

// ==========================================
// FUNGSI CETAK PDF (ROOMING & BUS)
// ==========================================
function cetakRooming() {
    let htmlKamar = '';
    const semuaKamar = document.querySelectorAll('.dropzone-kamar');
    
    semuaKamar.forEach(kamar => {
        const idKamar = kamar.id;
        if (idKamar === 'KMR-BELUM') return; // Jangan cetak yang belum diatur

        const headerEl = kamar.previousElementSibling;
        const judul = headerEl.querySelector('span:first-child').innerText;
        const badge = headerEl.querySelector('.badge').innerText;

        let isiJemaah = '';
        kamar.querySelectorAll('.kartu-jemaah').forEach((kartu, index) => {
            const nama = kartu.querySelector('.fw-bold').innerText;
            const info = kartu.querySelector('.text-muted').innerText;
            isiJemaah += `<tr><td style="width:10%; text-align:center;">${index+1}</td><td><strong>${nama}</strong><br><span style="font-size:11px; color:#555;">${info}</span></td></tr>`;
        });

        if (isiJemaah === '') isiJemaah = '<tr><td colspan="2" style="text-align:center; color:#999;">Kamar Kosong</td></tr>';

        htmlKamar += `
        <div class="box-kamar">
            <div class="box-header"><span>${judul}</span> <span>${badge}</span></div>
            <table class="table-jemaah">${isiJemaah}</table>
        </div>`;
    });

    const printWin = window.open('', '_blank');
    printWin.document.write(`
        <html><head><title>Rooming List - ${roomingPaket}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .kop { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .kop h2 { margin: 0; font-size: 22px; text-transform: uppercase; }
            .kop p { margin: 5px 0 0 0; font-size: 14px; }
            .grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .box-kamar { border: 1px solid #000; border-radius: 5px; overflow: hidden; page-break-inside: avoid; }
            .box-header { background: #333; color: #fff; padding: 8px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; }
            .table-jemaah { width: 100%; border-collapse: collapse; font-size: 13px; }
            .table-jemaah td { border-bottom: 1px solid #eee; padding: 6px; }
            @media print { @page { size: A4; margin: 1cm; } .grid-container { display: block; } .box-kamar { float: left; width: 31%; margin: 1%; } }
        </style>
        </head><body>
            <div class="kop"><h2>Daftar Pembagian Kamar (Rooming List)</h2><p>Paket: <strong>${roomingPaket}</strong> | ID Jadwal: ${roomingIdJadwal}</p></div>
            <div class="grid-container">${htmlKamar}</div>
            <script>window.onload = () => window.print();</script>
        </body></html>
    `);
    printWin.document.close();
}

function cetakBus() {
    const getNama = (idKrs) => {
        const k = document.getElementById(idKrs);
        if (!k) return '-';
        const crd = k.querySelector('.kartu-bus');
        return crd ? crd.querySelector('.fw-bold').innerText : '';
    };

    let htmlKursi = '';
    // Baris 1 sampai 10
    for(let i=1; i<=10; i++) {
        htmlKursi += `
        <tr>
            <td class="seat"><span>${i}A</span><br>${getNama(`KRS-${i}A`)}</td>
            <td class="seat"><span>${i}B</span><br>${getNama(`KRS-${i}B`)}</td>
            <td class="lorong">LORONG</td>
            <td class="seat"><span>${i}C</span><br>${getNama(`KRS-${i}C`)}</td>
            <td class="seat"><span>${i}D</span><br>${getNama(`KRS-${i}D`)}</td>
        </tr>`;
    }
    // Baris 11 (Belakang)
    htmlKursi += `
        <tr>
            <td class="seat belakang"><span>11A</span><br>${getNama('KRS-11A')}</td>
            <td class="seat belakang"><span>11B</span><br>${getNama('KRS-11B')}</td>
            <td class="seat belakang"><span>11C</span><br>${getNama('KRS-11C')}</td>
            <td class="seat belakang"><span>11D</span><br>${getNama('KRS-11D')}</td>
            <td class="seat belakang"><span>11E</span><br>${getNama('KRS-11E')}</td>
        </tr>`;

    const printWin = window.open('', '_blank');
    printWin.document.write(`
        <html><head><title>Denah Bus - ${busPaket}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; text-align: center; }
            .kop { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .kop h2 { margin: 0; font-size: 22px; text-transform: uppercase; }
            .bus-container { border: 3px solid #333; border-radius: 20px; padding: 20px; max-width: 700px; margin: 0 auto; background: #f9f9f9; }
            /* PERBAIKAN: Menggunakan flexbox untuk memisahkan Kiri dan Kanan */
            .sopir-box { display: flex; justify-content: space-between; padding: 0 10px; margin-bottom: 20px; font-weight: bold; font-size: 14px; }
            table { width: 100%; border-collapse: separate; border-spacing: 8px; }
            .seat { border: 2px solid #1a237e; border-radius: 8px; padding: 10px 5px; width: 22%; background: #fff; font-size: 13px; font-weight: bold; height: 50px; overflow: hidden; }
            .seat span { font-size: 10px; color: #fff; background: #1a237e; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 5px; }
            .lorong { width: 12%; color: #aaa; font-size: 12px; letter-spacing: 2px; }
            .belakang { width: 18%; }
            @media print { @page { size: A4 portrait; } body { -webkit-print-color-adjust: exact; } }
        </style>
        </head><body>
            <div class="kop"><h2>Denah Tempat Duduk Bus</h2><p>Paket: <strong>${busPaket}</strong> | ID Jadwal: ${busIdJadwal}</p></div>
            <div class="bus-container">
                <!-- PERBAIKAN: Elemen dipisah kiri dan kanan -->
                <div class="sopir-box">
                    <div>[ Pintu Depan ]</div>
                    <div>[ Supir & TL ]</div>
                </div>
                <table>${htmlKursi}</table>
            </div>
            <script>window.onload = () => window.print();</script>
        </body></html>
    `);
    printWin.document.close();
}