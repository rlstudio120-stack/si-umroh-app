// ==========================================
// LOGIKA PEMILIHAN SURAT (DROP-DOWN & AUTO NOMOR)
// ==========================================
let dataJemaahSurat = null;
let isFilterSuratLoaded = false;

async function loadDataSurat() {
    if (!isFilterSuratLoaded) {
        const selTahun = document.getElementById('filter-surat-tahun');
        const thnSekarang = new Date().getFullYear();
        let opsiTahun = `<option value="Semua">Semua Tahun</option>`;
        for (let t = thnSekarang + 1; t >= thnSekarang - 3; t--) {
            opsiTahun += `<option value="${t}" ${t === thnSekarang ? 'selected' : ''}>${t}</option>`;
        }
        if (selTahun) selTahun.innerHTML = opsiTahun;

        const selPaket = document.getElementById('filter-surat-paket');
        const snapshot = await db.collection("paket").where("status", "==", "Aktif").get();
        let opsiPaket = '<option value="Semua">Semua Paket Aktif</option>';
        let arrPaket = [];
        snapshot.forEach(doc => arrPaket.push(doc.data()));
        
        arrPaket.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        arrPaket.forEach(p => { opsiPaket += `<option value="${p.nama}">${p.nama}</option>`; });
        
        if (selPaket) {
            selPaket.innerHTML = opsiPaket;
            if (arrPaket.length > 0) selPaket.value = arrPaket[0].nama;
        }
        isFilterSuratLoaded = true;
    }

    const tbody = document.getElementById('tbody-surat');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Memuat data jemaah...</td></tr>';
    
    const valTahun = document.getElementById('filter-surat-tahun') ? document.getElementById('filter-surat-tahun').value : new Date().getFullYear().toString();
    const valPaket = document.getElementById('filter-surat-paket') ? document.getElementById('filter-surat-paket').value : 'Semua';

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
                html += `<tr>
                    <td class="align-middle fw-bold ps-4 text-primary d-none d-md-table-cell">${jm.id}</td>
                    <td class="align-middle fw-bold">${jm.nama || '-'}</td>
                    <td class="align-middle">${jm.paket || '-'}</td>
                    <td class="align-middle text-center"><button class="btn btn-primary btn-sm shadow-sm fw-bold" onclick="bukaModalSurat('${encodeURIComponent(JSON.stringify(jm))}')"><i class="bi bi-envelope-paper me-1"></i> Buat Surat</button></td>
                </tr>`;
            }
        });
        
        if (html === '') html = '<tr><td colspan="4" class="text-center text-muted py-4">Tidak ada data jemaah untuk filter tersebut.</td></tr>';
        tbody.innerHTML = html;
    });
}

function ubahFormSurat() {
    const jenis = document.getElementById('surat-jenis').value;
    const tgl = new Date();
    const romawi = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][tgl.getMonth()];
    const thn = tgl.getFullYear();
    
    // PENDETEKSI TAHUN BARU
    const tahunTerakhir = window.konfigurasiSurat.tahunSurat || thn;
    const isTahunBaru = thn > tahunTerakhir;
    
    let formatNo = '';
    let tglCetak = new Date().toISOString().split('T')[0]; // Default hari ini jika surat baru
    
    // CEK RIWAYAT NOMOR SURAT & TANGGAL JEMAAH
    if (jenis === 'paspor') {
        if (dataJemaahSurat.noSuratPaspor) {
            formatNo = dataJemaahSurat.noSuratPaspor;
            if (dataJemaahSurat.tglSuratPaspor) tglCetak = dataJemaahSurat.tglSuratPaspor;
        } else {
            let nextNo = isTahunBaru ? 1 : (window.konfigurasiSurat.noSR || 0) + 1;
            formatNo = `E ${String(nextNo).padStart(3, '0')}/SR/EIM/${romawi}/${thn}`;
        }
    } else {
        if (dataJemaahSurat.noSuratKeterangan) {
            formatNo = dataJemaahSurat.noSuratKeterangan;
            if (dataJemaahSurat.tglSuratKeterangan) tglCetak = dataJemaahSurat.tglSuratKeterangan;
        } else {
            let nextNo = isTahunBaru ? 1 : (window.konfigurasiSurat.noSK || 0) + 1;
            formatNo = `${String(nextNo).padStart(3, '0')}/SK/EIM/PMK/${romawi}/${thn}`;
        }
    }
    
    document.getElementById('surat-no').value = formatNo;
    document.getElementById('surat-tgl-cetak').value = tglCetak; // MENGUNCI TANGGAL LAMA JIKA ADA
    
    document.getElementById('area-surat-keterangan').className = (jenis === 'berangkat' || jenis === 'batal') ? 'border-top pt-3 mt-3' : 'd-none';
    document.getElementById('area-surat-batal').className = (jenis === 'batal') ? 'border-top pt-3 mt-2' : 'd-none';
}

function bukaModalSurat(encodedData) {
    dataJemaahSurat = JSON.parse(decodeURIComponent(encodedData));
    document.getElementById('surat-nama-jemaah').innerText = dataJemaahSurat.nama;
    document.getElementById('surat-jenis').value = 'paspor';
    document.getElementById('surat-tgl-berangkat').value = ''; 
    
    document.getElementById('surat-paspor').value = dataJemaahSurat.pasporNo || '';
    const toggleTtd = document.getElementById('surat-pakai-ttd');
    if (toggleTtd) toggleTtd.checked = false;
    
    ubahFormSurat(); 
    
    const modalEl = document.getElementById('modalSurat');
    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.show();
}


function applyFormatCss(objFormat) {
    if(!objFormat) return '';
    return `color: ${objFormat.color}; font-size: ${objFormat.size}pt; font-family: ${objFormat.font}; font-weight: ${objFormat.bold ? 'bold' : 'normal'}; font-style: ${objFormat.italic ? 'italic' : 'normal'}; text-decoration: ${objFormat.underline ? 'underline' : 'none'}; margin: 2px 0;`;
}

function cetakDokumenSurat(event) {
    event.preventDefault();
    const jenisSurat = document.getElementById('surat-jenis').value;
    const jm = dataJemaahSurat;
    const noSurat = document.getElementById('surat-no').value;
    const tglBerangkat = document.getElementById('surat-tgl-berangkat').value;
    const tglCetakInput = document.getElementById('surat-tgl-cetak').value; // Ambil nilai tanggal dari form
    const formatTgl = (t) => t ? new Date(t).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'}) : '-';
    
    // Kunci pengecekan: Apakah ini surat yang benar-benar baru?
    const isSuratBaru = (jenisSurat === 'paspor' && !jm.noSuratPaspor) || (jenisSurat !== 'paspor' && !jm.noSuratKeterangan);
    const fieldJemaah = (jenisSurat === 'paspor') ? 'noSuratPaspor' : 'noSuratKeterangan';
    const fieldTgl = (jenisSurat === 'paspor') ? 'tglSuratPaspor' : 'tglSuratKeterangan';

    // 1. JIKA SURAT BARU: Kunci Nomor & Tanggal
    if (isSuratBaru) {
        const matchNo = noSurat.match(/\d+/); 
        if (matchNo) {
            const usedNo = parseInt(matchNo[0], 10);
            const fieldToUpdate = (jenisSurat === 'paspor') ? 'noSR' : 'noSK';
            
            const thnCetak = new Date().getFullYear();
            const isTahunBaru = thnCetak > (window.konfigurasiSurat.tahunSurat || thnCetak);
            
            let payloadUpdate = {
                [fieldToUpdate]: usedNo,
                tahunSurat: thnCetak
            };
            
            window.konfigurasiSurat[fieldToUpdate] = usedNo;
            window.konfigurasiSurat.tahunSurat = thnCetak;
            
            if (isTahunBaru) {
                if (jenisSurat === 'paspor') { payloadUpdate.noSK = 0; window.konfigurasiSurat.noSK = 0; }
                else { payloadUpdate.noSR = 0; window.konfigurasiSurat.noSR = 0; }
            }

            db.collection("settings").doc("kop_surat").update(payloadUpdate);

            db.collection("jemaah").doc(jm.id).update({
                [fieldJemaah]: noSurat,
                [fieldTgl]: tglCetakInput
            });
            
            jm[fieldJemaah] = noSurat;
            jm[fieldTgl] = tglCetakInput;
        }
    } 
    // 2. JIKA SURAT LAMA: Cek apakah ada perubahan / input tanggal dari Admin
    else {
        if (jm[fieldTgl] !== tglCetakInput) {
            db.collection("jemaah").doc(jm.id).update({
                [fieldTgl]: tglCetakInput
            });
            jm[fieldTgl] = tglCetakInput; // Sinkronisasi ke memori lokal
        }
    }

    const pakaiTtd = document.getElementById('surat-pakai-ttd').checked;
    
    
    const imgKiri = window.konfigurasiSurat.logoKiri ? `<img src="${window.konfigurasiSurat.logoKiri}" class="kop-logo-kiri">` : '';
    const imgKanan = window.konfigurasiSurat.logoKanan ? `<img src="${window.konfigurasiSurat.logoKanan}" class="kop-logo-kanan">` : '';
    const imgWatermark = window.konfigurasiSurat.watermark ? `<img src="${window.konfigurasiSurat.watermark}" class="watermark">` : '';
    const imgTtd = (pakaiTtd && window.konfigurasiSurat.ttd) ? `<img src="${window.konfigurasiSurat.ttd}" class="ttd-img">` : '';

    let htmlKonten = '';

    if (jenisSurat === 'paspor') {
        htmlKonten = `
        <table class="tabel-header">
            <tr><td style="width: 12%;">Nomor</td><td style="width: 48%;">: ${noSurat}</td><td style="width: 40%; text-align: right;">Pamekasan, ${formatTgl(document.getElementById('surat-tgl-cetak').value)}</td></tr>
            <tr><td>Perihal</td><td>: <strong>Rekomendasi Pembuatan Passport</strong></td><td></td></tr>
        </table>
        <p>Kepada Yth,<br><strong>Kepala Kantor Imigrasi Kelas II Pamekasan</strong></p>
        <p>Dengan Hormat,<br>Saya yang bertanda tangan di bawah ini:</p>
        <table class="tabel-data">
            <tr><td style="width: 150px;">Nama</td><td>: <strong>NOVI KAMALIA</strong></td></tr>
            <tr><td>Jabatan</td><td>: Direktur Utama ${window.konfigurasiSurat.nama.text}</td></tr>
            <tr><td>Alamat</td><td>: ${window.konfigurasiSurat.alamat.text}</td></tr>
        </table>
        <p>Menerangkan:</p>
        <table class="tabel-data">
            <tr><td style="width: 150px;">Nama Lengkap</td><td>: <strong>${jm.nama}</strong></td></tr>
            <tr><td>NIK</td><td>: ${jm.nik || '-'}</td></tr>
            <tr><td>Tetala</td><td>: ${jm.tempatLahir || '-'}, ${formatTgl(jm.tglLahir)}</td></tr>
            <tr><td>Alamat</td><td>: ${jm.alamat || '-'}</td></tr>
        </table>
        <p>Adalah Calon Jamaah Umroh travel kami AL IMRON <strong>${window.konfigurasiSurat.nama.text}</strong> yang insyaallah akan berangkat melaksanakan ibadah umroh pada tanggal <strong>${tglBerangkat}</strong>. Untuk itu, kami mohon agar nama tersebut diatas, bisa dibantu dalam Proses Pembuatan Passport (Dokumen Perjalanannya), dan kami bertanggung jawab serta menjamin sepenuhnya terhadap calon jamaah umroh kami, dengan memperhatikan hal-hal sebagai berikut:</p>
        <ol>
            <li style="margin-bottom: 5px;">Pemohon paspor adalah Warga Negara Indonesia (WNI) yang akan melaksanakan perjalanan ke negara Arab Saudi untuk melaksanakan ibadah umroh (jamaah).</li>
            <li style="margin-bottom: 5px;">Selama melaksanakan ibadah umroh, jamaah tersebut sepenuhnya menjadi tanggung jawab kami, mulai dari keberangkatan hingga kepulangan ke tanah air.</li>
            <li style="margin-bottom: 5px;">Kami menjamin sepenuhnya bahwa jamaah tersebut tidak akan melakukan:
                <ul style="list-style-type: lower-alpha; margin-top: 5px;">
                    <li>Pelanggaran peraturan keimigrasian berupa penyalahgunaan izin tinggal, dan tidak melebihi izin tinggal (overstay).</li>
                    <li>Memalsukan atau membuat paspor palsu yang di berikan kepadanya, dan</li>
                    <li>Bekerja secara illegal.</li>
                </ul>
            </li>
        </ol>
        <p>Demikian Surat Rekomendasi ini kami buat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
        <div class="ttd-box">
            Hormat kami,<br><strong>${window.konfigurasiSurat.nama.text}</strong><br>
            ${imgTtd}
            <div class="ttd-nama" style="margin-top: ${imgTtd ? '5px' : '90px'}">NOVI KAMALIA</div>
            <div>Direktur Utama</div>
        </div>`;
    } 
    else {
        const pkj = document.getElementById('surat-pekerjaan').value;
        const ins = document.getElementById('surat-instansi').value;
        let paragrafIsi = '';
        if(jenisSurat === 'berangkat') {
            paragrafIsi = `Adalah benar jemaah umrah TRAVEL AL-IMRON <strong>${window.konfigurasiSurat.nama.text}</strong> yang insyaallah akan berangkat melaksanakan umroh pada tanggal <strong>${tglBerangkat}</strong>. Untuk itu, kami mohon kiranya dapat diberikan izin untuk menunaikan ibadah umroh.`;
        } else {
            const pasporEdit = document.getElementById('surat-paspor').value || '-';
            const visa = document.getElementById('surat-visa').value || '-';
            const tiket = document.getElementById('surat-tiket').value || '-';
            const alasan = document.getElementById('surat-alasan').value;
            paragrafIsi = `
            <tr><td>No. Paspor</td><td>: ${pasporEdit}</td></tr>
            <tr><td>Nomor Visa</td><td>: ${visa}</td></tr>
            <tr><td>Kode Booking Tiket</td><td>: ${tiket}</td></tr>
            </table>
            <p>Adalah benar jemaah umrah TRAVEL AL-IMRON <strong>${window.konfigurasiSurat.nama.text}</strong> yang semula dijadwalkan akan berangkat untuk melaksanakan ibadah umrah pada tanggal <strong>${tglBerangkat}</strong>.</p>
            <p>Namun, ${alasan}</p>
            <p>Surat keterangan ini dibuat berdasarkan data administrasi perusahaan dan informasi yang diterima mengenai kondisi jemaah yang bersangkutan. Surat ini dipergunakan sebagai dokumen pendukung administrasi terkait ketidakberangkatan jemaah karena alasan tersebut.</p>
            `;
        }

        htmlKonten = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; text-decoration: underline;">SURAT KETERANGAN</h2>
            <p style="margin: 0;">Nomor : ${noSurat}</p>
        </div>
        <p>Yang bertanda tangan di bawah ini:</p>
        <table class="tabel-data">
            <tr><td style="width: 150px;">Nama</td><td>: <strong>Dr. NOVI KAMALIA IMRON</strong></td></tr>
            <tr><td>Tetala</td><td>: Pamekasan, 08 November 1984</td></tr>
            <tr><td>Jabatan</td><td>: Direktur ${window.konfigurasiSurat.nama.text}</td></tr>
            <tr><td>Alamat Kantor</td><td>: Jl. Veteran Gg. VI No. 7 Barurambat Timur Pamekasan Madura</td></tr>
        </table>
        <p>Menerangkan dengan sebenarnya bahwa:</p>
        <table class="tabel-data" style="margin-bottom: ${jenisSurat==='batal'? '0' : '15px'};">
            <tr><td style="width: 150px;">Nama</td><td>: <strong>${jm.nama}</strong></td></tr>
            <tr><td>Tetala</td><td>: ${jm.tempatLahir || '-'}, ${formatTgl(jm.tglLahir)}</td></tr>
            <tr><td>Alamat</td><td>: ${jm.alamat || '-'}</td></tr>
            <tr><td>Pekerjaan/Jabatan</td><td>: ${pkj || '-'}</td></tr>
            <tr><td>NIP/NIK</td><td>: ${jm.nik || '-'}</td></tr>
            <tr><td>Nama Instansi</td><td>: ${ins || '-'}</td></tr>
            ${jenisSurat === 'berangkat' ? `</table><p>${paragrafIsi}</p>` : paragrafIsi}
        
        <p>Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya, dan atas perhatian yang diberikan kami ucapkan banyak terima kasih.</p>
        
        <div class="ttd-box">
            Pamekasan, ${formatTgl(document.getElementById('surat-tgl-cetak').value)}<br>Hormat kami<br>
            ${imgTtd}
            <div class="ttd-nama" style="margin-top: ${imgTtd ? '5px' : '90px'}">Dr. NOVI KAMALIA IMRON</div>
        </div>`;
    }


    // 1. TUTUP MODAL LEBIH DULU
    const modalEl = document.getElementById('modalSurat');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
        modalInstance.hide();
    }

    // 2. BERI JEDA SETENGAH DETIK AGAR KUNCI FOKUS BOOTSTRAP TERLEPAS, LALU BUKA PDF
    setTimeout(() => {
        const printWin = window.open('', '_blank');
        printWin.document.write(`
        <html><head><title>Cetak Dokumen - ${jm.nama}</title>
            <style>
                @page { size: A4 portrait; margin: 15mm 20mm 20mm 20mm; }
                body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .watermark { position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%); width: 55%; opacity: 0.15; z-index: -10; pointer-events: none; }
                .kop-surat { display: flex; align-items: center; justify-content: space-between; border-bottom: 4px double black; padding-bottom: 10px; margin-bottom: 20px; }
                .kop-logo-kiri, .kop-logo-kanan { width: 95px; height: auto; object-fit: contain; }
                .kop-text { text-align: center; flex-grow: 1; padding: 0 15px; }
                .content { text-align: justify; }
                .tabel-header { width: 100%; margin-bottom: 15px; font-size: 12pt; }
                .tabel-data { margin-left: 20px; border-collapse: collapse; margin-bottom: 10px; font-size: 12pt; }
                .tabel-data td { padding: 2px 5px; vertical-align: top; }
                .ttd-box { float: right; width: 280px; text-align: center; margin-top: 30px; page-break-inside: avoid; }
                .ttd-img { max-height: 80px; width: auto; object-fit: contain; margin-top: 10px; display: block; margin-left: auto; margin-right: auto; }
                .ttd-nama { font-weight: bold; text-decoration: underline; }
            </style>
        </head><body>
            ${imgWatermark}
            <div class="kop-surat">
                <div style="width: 95px;">${imgKiri}</div>
                <div class="kop-text">
                    <div style="${applyFormatCss(window.konfigurasiSurat.nama)}">${window.konfigurasiSurat.nama.text}</div>
                    <div style="${applyFormatCss(window.konfigurasiSurat.sub)}">${window.konfigurasiSurat.sub.text}</div>
                    <div style="${applyFormatCss(window.konfigurasiSurat.alamat)}">${window.konfigurasiSurat.alamat.text}</div>
                </div>
                <div style="width: 95px; text-align: right;">${imgKanan}</div>
            </div>
            <div class="content">${htmlKonten}</div>
            <script>setTimeout(() => { window.print(); }, 800);</script>
        </body></html>`);
        printWin.document.close();
        
        // Segarkan tabel setelah semuanya aman
        loadDataSurat();
    }, 500); // <-- Angka 500ms adalah jeda penunggu animasi modal tertutup
}