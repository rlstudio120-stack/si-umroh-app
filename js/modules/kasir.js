// js/modules/kasir.js

let isFilterKasirLoaded = false;
let dataJemaahKasir = null; // Menyimpan data jemaah yang sedang dibuka

// ==========================================
// FORMAT RUPIAH OTOMATIS
// ==========================================
function formatRupiahText(angka) {
    return new Intl.NumberFormat('id-ID').format(angka || 0);
}

function formatRupiahInput(angka) {
    let value = angka.value.replace(/[^,\d]/g, '').toString();
    let split = value.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    angka.value = rupiah;
}

function cleanRupiah(formattedString) {
    return parseInt(formattedString.replace(/[^0-9]/g, '')) || 0;
}

// ==========================================
// LOAD DATA TABEL KASIR UTAMA
// ==========================================
async function loadDataKasir() {
    if (!isFilterKasirLoaded) {
        const selTahun = document.getElementById('filter-kasir-tahun');
        const thnSekarang = new Date().getFullYear();
        let opsiTahun = `<option value="Semua">Semua Tahun</option>`;
        for (let t = thnSekarang + 1; t >= thnSekarang - 3; t--) { opsiTahun += `<option value="${t}" ${t === thnSekarang ? 'selected' : ''}>${t}</option>`; }
        if (selTahun) selTahun.innerHTML = opsiTahun;

        const selPaket = document.getElementById('filter-kasir-paket');
        const snapshot = await db.collection("paket").where("status", "==", "Aktif").get();
        let opsiPaket = '<option value="Semua">Semua Paket Aktif</option>';
        let arrPaket = [];
        snapshot.forEach(doc => arrPaket.push(doc.data()));
        arrPaket.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        arrPaket.forEach(p => { opsiPaket += `<option value="${p.nama}">${p.nama}</option>`; });
        
        if (selPaket) { selPaket.innerHTML = opsiPaket; if (arrPaket.length > 0) selPaket.value = arrPaket[0].nama; }
        isFilterKasirLoaded = true;
    }

    if ($.fn.DataTable.isDataTable('#tabel-kasir')) { $('#tabel-kasir').DataTable().clear().destroy(); }
    const tbody = document.getElementById('tbody-kasir');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-success spinner-border-sm me-2"></div>Memuat data kasir...</td></tr>';
    
    const valTahun = document.getElementById('filter-kasir-tahun') ? document.getElementById('filter-kasir-tahun').value : new Date().getFullYear().toString();
    const valPaket = document.getElementById('filter-kasir-paket') ? document.getElementById('filter-kasir-paket').value : 'Semua';

    db.collection("jemaah").orderBy("createdAt", "desc").get().then((snapshot) => {
        let html = '';
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
                // Kalkulasi Status Bayar
                let tagihan = jm.tagihan || 0;
                let terbayar = jm.terbayar || 0;
                let statusBayar = 'Belum Bayar'; 
                let badgeColor = 'bg-danger';

                if (terbayar > 0 && terbayar < tagihan) { statusBayar = 'Nyicil (Belum Lunas)'; badgeColor = 'bg-warning text-dark'; }
                else if (tagihan > 0 && terbayar >= tagihan) { statusBayar = 'LUNAS'; badgeColor = 'bg-success'; }

                const encodedData = encodeURIComponent(JSON.stringify(jm));

                html += `<tr>
                    <td class="align-middle fw-bold ps-4 text-primary d-none d-md-table-cell">${jm.id}</td>
                    <td class="align-middle fw-bold">${jm.nama || '-'}</td>
                    <td class="align-middle">${jm.paket || '-'}</td>
                    <td class="align-middle"><span class="badge ${badgeColor}">${statusBayar}</span></td>
                    <td class="align-middle text-end pe-4">
                        <button class="btn btn-success btn-sm shadow-sm fw-bold" onclick="bukaModalKasir('${encodedData}')">
                            <i class="bi bi-wallet2 me-1"></i> Buka Kasir
                        </button>
                    </td>
                </tr>`;
            }
        });
        
        if (html === '') html = '<tr><td colspan="5" class="text-center text-muted py-4">Tidak ada data jemaah untuk filter tersebut.</td></tr>';
        tbody.innerHTML = html;

        $('#tabel-kasir').DataTable({
            language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/id.json', emptyTable: "Belum ada data jemaah." },
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Semua"]],
            pageLength: 10,
            dom: '<"d-flex flex-wrap justify-content-between align-items-center mb-3"lf>rt<"d-flex flex-wrap justify-content-between align-items-center mt-3"ip>'
        });
    });
}

// ==========================================
// BUKA MODAL & KALKULASI KASIR
// ==========================================
// ==========================================
// BUKA MODAL & KALKULASI KASIR
// ==========================================
async function bukaModalKasir(encodedData) {
    dataJemaahKasir = JSON.parse(decodeURIComponent(encodedData));
    
    document.getElementById('kasir-nama').innerText = dataJemaahKasir.nama;
    document.getElementById('kasir-paket').innerText = dataJemaahKasir.paket;
    
    const inputTagihan = document.getElementById('kasir-tagihan');
    inputTagihan.value = 'Mencari harga...';
    
    // 1. Cek apakah jemaah sudah punya nominal tagihan yang tersimpan
    if (dataJemaahKasir.tagihan && dataJemaahKasir.tagihan > 0) {
        inputTagihan.value = formatRupiahText(dataJemaahKasir.tagihan);
    } else {
        // 2. Jika tagihan masih 0, tarik otomatis dari Harga Paket di database
        try {
            const snapshot = await db.collection("paket").where("nama", "==", dataJemaahKasir.paket).limit(1).get();
            let hargaOtomatis = 0;
            
            if (!snapshot.empty) {
                const dataPaket = snapshot.docs[0].data();
                // Mengambil field 'harga' dari paket. Jika tidak ada, default 0
                hargaOtomatis = dataPaket.harga || 0; 
            }
            
            inputTagihan.value = formatRupiahText(hargaOtomatis);
            
            // Otomatis simpan harga awal ini ke data jemaah (jika lebih dari 0)
            if (hargaOtomatis > 0) {
                await db.collection("jemaah").doc(dataJemaahKasir.id).update({ tagihan: hargaOtomatis });
                dataJemaahKasir.tagihan = hargaOtomatis;
            }
        } catch (error) {
            console.error("Gagal menarik harga paket:", error);
            inputTagihan.value = 0;
        }
    }
    
    document.getElementById('input-bayar-tgl').value = new Date().toISOString().split('T')[0];
    document.getElementById('input-bayar-nominal').value = '';
    document.getElementById('input-bayar-ket').value = '';
    
    // Buka tab Input Pembayaran Baru secara default
    const triggerEl = document.querySelector('#kasirTab button[data-bs-target="#input-bayar"]');
    bootstrap.Tab.getOrCreateInstance(triggerEl).show();

    refreshDataKeuangan();
    new bootstrap.Modal(document.getElementById('modalKasir')).show();
}

function refreshDataKeuangan() {
    const id = dataJemaahKasir.id;
    db.collection("jemaah").doc(id).collection("transaksi").orderBy("tanggal", "desc").get().then((snapshot) => {
        let totalDibayar = 0;
        let htmlRiwayat = '';

        if (snapshot.empty) {
            htmlRiwayat = '<tr><td colspan="5" class="text-muted py-3">Belum ada riwayat pembayaran</td></tr>';
        } else {
            snapshot.forEach(doc => {
                const tr = doc.data(); tr.id = doc.id;
                totalDibayar += tr.nominal;
                const trData = encodeURIComponent(JSON.stringify(tr));
                
                htmlRiwayat += `
                <tr>
                    <td>${tr.tglFormat}</td>
                    <td class="text-start">
                        <span class="badge bg-secondary mb-1"><i class="bi bi-hash"></i> ${tr.noKwitansi || '-'}</span><br>
                        <span class="fw-bold">${tr.keterangan}</span>
                    </td>
                    <td>${tr.metode}</td>
                    <td class="text-end fw-bold text-success">${formatRupiahText(tr.nominal)}</td>
                    <td><button class="btn btn-outline-dark btn-sm py-0" onclick="cetakKwitansi('${trData}')" title="Cetak Kwitansi"><i class="bi bi-printer"></i></button></td>
                </tr>`;
            });
        }
        
        document.getElementById('tbody-riwayat-bayar').innerHTML = htmlRiwayat;
        
        const tagihan = cleanRupiah(document.getElementById('kasir-tagihan').value);
        const sisa = tagihan - totalDibayar;
        
        document.getElementById('kasir-terbayar').innerText = formatRupiahText(totalDibayar);
        document.getElementById('kasir-sisa').innerText = formatRupiahText(sisa);
        
        let statusEl = document.getElementById('kasir-status');
        if (totalDibayar === 0) { statusEl.innerText = 'Belum Bayar'; statusEl.className = 'badge bg-danger fs-6 shadow-sm'; }
        else if (totalDibayar < tagihan) { statusEl.innerText = 'Nyicil (Belum Lunas)'; statusEl.className = 'badge bg-warning text-dark fs-6 shadow-sm'; }
        else { statusEl.innerText = 'LUNAS'; statusEl.className = 'badge bg-success fs-6 shadow-sm'; }
        
        db.collection("jemaah").doc(id).update({ terbayar: totalDibayar });
    });
}

function simpanTagihan() {
    const tagihanBaru = cleanRupiah(document.getElementById('kasir-tagihan').value);
    db.collection("jemaah").doc(dataJemaahKasir.id).update({ tagihan: tagihanBaru }).then(() => {
        Swal.fire({ icon: 'success', title: 'Tersimpan', text: 'Total Tagihan berhasil diperbarui', timer: 1500, showConfirmButton: false });
        dataJemaahKasir.tagihan = tagihanBaru;
        refreshDataKeuangan();
        loadDataKasir(); // Update tabel belakang
    });
}

// ==========================================
// SIMPAN TRANSAKSI & CETAK KWITANSI
// ==========================================
async function simpanPembayaran(event) {
    event.preventDefault();

    // 1. Ambil data tagihan dan pembayaran saat ini di layar
    const tagihanSaatIni = cleanRupiah(document.getElementById('kasir-tagihan').value);
    const terbayarSaatIni = cleanRupiah(document.getElementById('kasir-terbayar').innerText);
    const sisaTagihan = tagihanSaatIni - terbayarSaatIni;
    const nominal = cleanRupiah(document.getElementById('input-bayar-nominal').value);

    // 2. Blokir jika jemaah sudah lunas
    if (tagihanSaatIni > 0 && terbayarSaatIni >= tagihanSaatIni) {
        Swal.fire({ 
            icon: 'info', 
            title: 'Sudah Lunas!', 
            text: 'Jemaah ini sudah melunasi seluruh tagihan. Pembayaran baru dibatalkan.' 
        });
        return;
    }

    // 3. Blokir jika input nominal melebihi sisa tagihan
    if (tagihanSaatIni > 0 && nominal > sisaTagihan) {
        Swal.fire({ 
            icon: 'warning', 
            title: 'Nominal Berlebih', 
            text: `Nominal bayar melebihi sisa tagihan. Sisa tagihan saat ini: Rp ${formatRupiahText(sisaTagihan)}.` 
        });
        return;
    }

    if (nominal <= 0) { Swal.fire('Error', 'Nominal harus lebih dari 0', 'error'); return; }

    const btn = document.getElementById('btn-simpan-bayar');
    btn.disabled = true; btn.innerHTML = 'Menyimpan...';

    try {
        const docSet = await db.collection("settings").doc("kop_surat").get();
        let noKWT = 0, tahunSurat = new Date().getFullYear();
        if (docSet.exists) {
            const dataSet = docSet.data();
            noKWT = dataSet.noKWT || 0;
            tahunSurat = dataSet.tahunSurat || tahunSurat;
        }

        const tglInput = document.getElementById('input-bayar-tgl').value;
        const dateObj = new Date(tglInput);
        const thnCetak = dateObj.getFullYear();
        const romawi = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][dateObj.getMonth()];
        
        const isTahunBaru = thnCetak > tahunSurat;
        let nextNo = isTahunBaru ? 1 : noKWT + 1;
        let noKwitansi = `${String(nextNo).padStart(3, '0')}/KWT/EIM/${romawi}/${thnCetak}`;
        const tglFormatId = dateObj.toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'});

        const payloadTrans = {
            noKwitansi: noKwitansi,
            nominal: nominal,
            tanggal: tglInput,
            tglFormat: tglFormatId,
            metode: document.getElementById('input-bayar-metode').value,
            keterangan: document.getElementById('input-bayar-ket').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection("jemaah").doc(dataJemaahKasir.id).collection("transaksi").add(payloadTrans);
        
        let payloadUpdateSet = { noKWT: nextNo };
        if (isTahunBaru) {
            payloadUpdateSet.tahunSurat = thnCetak;
            payloadUpdateSet.noSR = 0; 
            payloadUpdateSet.noSK = 0;
        }
        await db.collection("settings").doc("kop_surat").update(payloadUpdateSet);

        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Pembayaran dicatat!', timer: 1500, showConfirmButton: false });
        
        document.getElementById('input-bayar-nominal').value = '';
        document.getElementById('input-bayar-ket').value = '';
        bootstrap.Tab.getOrCreateInstance(document.querySelector('#kasirTab button[data-bs-target="#riwayat-bayar"]')).show();
        
        refreshDataKeuangan();
        loadDataKasir();
    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    } finally {
        btn.disabled = false; btn.innerHTML = '<i class="bi bi-save me-1"></i> Simpan Transaksi';
    }
}

function cetakKwitansi(encodedTrData) {
    const tr = JSON.parse(decodeURIComponent(encodedTrData));
    
    // Fungsi terbilang Rupiah
    const terbilang = (angka) => {
        const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
        if (angka < 12) return huruf[angka];
        if (angka < 20) return terbilang(angka - 10) + " Belas";
        if (angka < 100) return terbilang(Math.floor(angka / 10)) + " Puluh " + terbilang(angka % 10);
        if (angka < 200) return "Seratus " + terbilang(angka - 100);
        if (angka < 1000) return terbilang(Math.floor(angka / 100)) + " Ratus " + terbilang(angka % 100);
        if (angka < 2000) return "Seribu " + terbilang(angka - 1000);
        if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + " Ribu " + terbilang(angka % 1000);
        if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + " Juta " + terbilang(angka % 1000000);
        return "";
    };

    // Ambil Kop Surat dari Pengaturan
    // Ambil Kop Surat dari Pengaturan
    db.collection("settings").doc("kop_surat").get().then((docRef) => {
        let namaTravel = "PT. ENKA IMRON MANDIRI";
        let alamatTravel = "Jl. Veteran Gg. VI No. 7 Pamekasan Madura";
        let logo = "";
        let logoKanan = "";
        
        if (docRef.exists) {
            const kop = docRef.data();
            namaTravel = typeof kop.nama === 'object' ? kop.nama.text : kop.nama;
            alamatTravel = typeof kop.alamat === 'object' ? kop.alamat.text : kop.alamat;
            logo = kop.logoKiri ? `<img src="${kop.logoKiri}" style="height: 55px; max-width: 100px; object-fit: contain;">` : '';
            logoKanan = kop.logoKanan ? `<img src="${kop.logoKanan}" style="height: 55px; max-width: 100px; object-fit: contain;">` : '';
        }

        const printWin = window.open('', '_blank');
        printWin.document.write(`
        <html><head><title>Kwitansi - ${dataJemaahKasir.nama}</title>
            <style>
                /* Kunci ukuran cetak ke A5 Landscape dengan margin presisi */
                @page { size: A5 landscape; margin: 10mm; }
                body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                
                /* Kunci tinggi maksimal kwitansi agar tidak tumpah ke halaman 2 */
                .kwitansi-box { 
                    border: 2px solid #000; 
                    padding: 15px 20px; 
                    border-radius: 10px; 
                    height: 125mm; /* Maksimal tinggi A5 setelah dikurangi margin */
                    box-sizing: border-box; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: space-between; 
                }
                
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 10px; }
                .title { font-size: 22px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #1a237e; }
                .kop-info { line-height: 1.2; }
                
                .table-info { width: 100%; font-size: 14px; margin-bottom: 5px; }
                .table-info td { padding: 4px; vertical-align: middle; }
                .terbilang-box { background: #f0f0f0; padding: 8px 12px; font-style: italic; font-weight: bold; border: 1px solid #ccc; border-radius: 5px; display: block; width: 95%; }
                
                .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; }
                .nominal-box { background: #ffe600; color: #020202; padding: 8px 20px; font-size: 20px; font-weight: bold; border-radius: 5px; border: 2px solid #000; letter-spacing: 1px; }
                .ttd-area { text-align: center; width: 220px; font-size: 14px; }
            </style>
        </head><body>
            <div class="kwitansi-box">
                <div class="header">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        ${logo}
                        <div class="kop-info">
                            <strong style="font-size: 16px;">${namaTravel}</strong><br>
                            <span style="font-size: 11px;">${alamatTravel}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        ${logoKanan}
                    </div>
                </div>
                
                <div style="text-align: center; margin-bottom: 15px;">
                    <div class="title" style="text-decoration: underline; display: inline-block;">KWITANSI</div>
                    <div style="font-weight: bold; font-size: 14px; margin-top: 3px;">No. ${tr.noKwitansi || '-'}</div>
                </div>
                
                <table class="table-info">
                    <tr><td width="160">Telah terima dari</td><td width="15">:</td><td><strong style="font-size: 15px;">${dataJemaahKasir.nama}</strong></td></tr>
                    <tr><td>Uang Sejumlah</td><td>:</td><td><div class="terbilang-box"># ${terbilang(tr.nominal)} Rupiah #</div></td></tr>
                    <tr><td>Untuk Pembayaran</td><td>:</td><td>${tr.keterangan} - ${dataJemaahKasir.paket} (${tr.metode})</td></tr>
                </table>
                
                <div class="footer">
                    <div class="nominal-box">Rp ${formatRupiahText(tr.nominal)}</div>
                    <div class="ttd-area">
                        Pamekasan, ${tr.tglFormat}<br>Penerima / Kasir<br><br><br><br>
                        <b>( ...................................... )</b>
                    </div>
                </div>
            </div>
            <script>setTimeout(() => { window.print(); }, 800);</script>
        </body></html>`);
        printWin.document.close();
    });
}