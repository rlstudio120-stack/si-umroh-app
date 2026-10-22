// js/modules/surat.js

// ==========================================
// PENGATURAN KOP SURAT & NOMOR (DINAMIS)
// ==========================================
let konfigurasiSurat = {
    nama: { text: 'PT. ENKA IMRON MANDIRI', color: '#000000', size: 24, font: 'Arial, sans-serif', bold: true, italic: false, underline: false },
    sub: { text: 'Penyelenggara Perjalanan Ibadah Umroh & Haji Khusus', color: '#000000', size: 11, font: 'Arial, sans-serif', bold: false, italic: false, underline: false },
    alamat: { text: 'Jl. Veteran Gg. VI No. 7 Pamekasan Madura', color: '#000000', size: 10, font: 'Arial, sans-serif', bold: false, italic: false, underline: false },
    logoKiri: '', logoKanan: '', watermark: '', ttd: '',
    noSR: 0, noSK: 0 // Default Nomor Terakhir
};

db.collection("settings").doc("kop_surat").get().then((doc) => {
    if (doc.exists) {
        const data = doc.data();
        if (typeof data.nama === 'string') {
            konfigurasiSurat.nama.text = data.nama || '';
            konfigurasiSurat.sub.text = data.sub || '';
            konfigurasiSurat.alamat.text = data.alamat || '';
        } else {
            konfigurasiSurat.nama = { ...konfigurasiSurat.nama, ...data.nama };
            konfigurasiSurat.sub = { ...konfigurasiSurat.sub, ...data.sub };
            konfigurasiSurat.alamat = { ...konfigurasiSurat.alamat, ...data.alamat };
        }
        konfigurasiSurat.logoKiri = data.logoKiri || '';
        konfigurasiSurat.logoKanan = data.logoKanan || '';
        konfigurasiSurat.watermark = data.watermark || '';
        konfigurasiSurat.ttd = data.ttd || '';
        konfigurasiSurat.noSR = parseInt(data.noSR) || 0;
        konfigurasiSurat.noSK = parseInt(data.noSK) || 0;
    }
});

// ==========================================
// FORM PENGATURAN (LOAD & SAVE)
// ==========================================
function isiFormFormat(idPrefix, objData) {
    document.getElementById(`${idPrefix}`).value = objData.text;
    document.getElementById(`${idPrefix}-color`).value = objData.color;
    document.getElementById(`${idPrefix}-size`).value = objData.size;
    document.getElementById(`${idPrefix}-font`).value = objData.font;
    document.getElementById(`${idPrefix}-b`).checked = objData.bold;
    document.getElementById(`${idPrefix}-i`).checked = objData.italic;
    document.getElementById(`${idPrefix}-u`).checked = objData.underline;
}

function tarikDataFormat(idPrefix) {
    return {
        text: document.getElementById(`${idPrefix}`).value,
        color: document.getElementById(`${idPrefix}-color`).value,
        size: document.getElementById(`${idPrefix}-size`).value,
        font: document.getElementById(`${idPrefix}-font`).value,
        bold: document.getElementById(`${idPrefix}-b`).checked,
        italic: document.getElementById(`${idPrefix}-i`).checked,
        underline: document.getElementById(`${idPrefix}-u`).checked
    };
}

function bukaModalSettingSurat() {
    isiFormFormat('set-kop-nama', konfigurasiSurat.nama);
    isiFormFormat('set-kop-sub', konfigurasiSurat.sub);
    isiFormFormat('set-kop-alamat', konfigurasiSurat.alamat);
    
    document.getElementById('set-no-sr').value = konfigurasiSurat.noSR;
    document.getElementById('set-no-sk').value = konfigurasiSurat.noSK;
    
    const showPreview = (id, url) => {
        const img = document.getElementById(id);
        if (img) {
            if (url) { img.src = url; img.classList.remove('d-none'); } 
            else { img.classList.add('d-none'); }
        }
    };
    showPreview('preview-logo-kiri', konfigurasiSurat.logoKiri);
    showPreview('preview-logo-kanan', konfigurasiSurat.logoKanan);
    showPreview('preview-logo-watermark', konfigurasiSurat.watermark);
    showPreview('preview-ttd', konfigurasiSurat.ttd);

    new bootstrap.Modal(document.getElementById('modalSettingSurat')).show();
}

async function simpanSettingSurat(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSimpanSettingSurat');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';
    btn.disabled = true;

    try {
        const up = async (id, lama) => { const f = document.getElementById(id).files[0]; return f ? await uploadKeCloudinary(f) : lama; };
        
        const payload = {
            nama: tarikDataFormat('set-kop-nama'),
            sub: tarikDataFormat('set-kop-sub'),
            alamat: tarikDataFormat('set-kop-alamat'),
            logoKiri: await up('set-file-kiri', konfigurasiSurat.logoKiri),
            logoKanan: await up('set-file-kanan', konfigurasiSurat.logoKanan),
            watermark: await up('set-file-watermark', konfigurasiSurat.watermark),
            ttd: await up('set-file-ttd', konfigurasiSurat.ttd),
            noSR: parseInt(document.getElementById('set-no-sr').value) || 0,
            noSK: parseInt(document.getElementById('set-no-sk').value) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("settings").doc("kop_surat").set(payload);
        konfigurasiSurat = payload; 
        
        Swal.fire('Berhasil', 'Pengaturan Kop Surat, TTD, & Penomoran diperbarui!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalSettingSurat')).hide();
    } catch (error) {
        Swal.fire('Gagal', error.message, 'error');
    } finally {
        btn.innerHTML = '<i class="bi bi-save me-1"></i> Simpan Pengaturan';
        btn.disabled = false;
    }
}

// ==========================================
// LOGIKA PEMILIHAN SURAT (DROP-DOWN & AUTO NOMOR)
// ==========================================
let dataJemaahSurat = null;

function loadDataSurat() {
    const tbody = document.getElementById('tbody-surat');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Memuat data...</td></tr>';
    db.collection("jemaah").orderBy("createdAt", "desc").get().then((snapshot) => {
        let html = '';
        snapshot.forEach((doc) => {
            const jm = doc.data(); jm.id = doc.id;
            html += `<tr>
                <td class="align-middle fw-bold ps-4 text-primary">${jm.id}</td>
                <td class="align-middle fw-bold">${jm.nama || '-'}</td>
                <td class="align-middle">${jm.paket || '-'}</td>
                <td class="align-middle text-center"><button class="btn btn-primary btn-sm shadow-sm fw-bold" onclick="bukaModalSurat('${encodeURIComponent(JSON.stringify(jm))}')"><i class="bi bi-envelope-paper me-1"></i> Buat Surat</button></td>
            </tr>`;
        });
        tbody.innerHTML = html;
    });
}

function ubahFormSurat() {
    const jenis = document.getElementById('surat-jenis').value;
    const tgl = new Date();
    const romawi = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][tgl.getMonth()];
    const thn = tgl.getFullYear();
    
    // PENDETEKSI TAHUN BARU: Bandingkan tahun sekarang dengan tahun terakhir di memori
    const tahunTerakhir = konfigurasiSurat.tahunSurat || thn;
    const isTahunBaru = thn > tahunTerakhir;
    
    let nextNo = 1;
    let formatNo = '';
    
    if (jenis === 'paspor') {
        // Jika tahun baru, mulai dari 1. Jika tidak, ambil nomor terakhir + 1
        nextNo = isTahunBaru ? 1 : (konfigurasiSurat.noSR || 0) + 1;
        formatNo = `E ${String(nextNo).padStart(3, '0')}/SR/EIM/${romawi}/${thn}`;
    } else {
        nextNo = isTahunBaru ? 1 : (konfigurasiSurat.noSK || 0) + 1;
        formatNo = `${String(nextNo).padStart(3, '0')}/SK/EIM/PMK/${romawi}/${thn}`;
    }
    
    document.getElementById('surat-no').value = formatNo;
    
    // Tampilkan / Sembunyikan Field Tambahan
    document.getElementById('area-surat-keterangan').className = (jenis === 'berangkat' || jenis === 'batal') ? 'border-top pt-3 mt-3' : 'd-none';
    document.getElementById('area-surat-batal').className = (jenis === 'batal') ? 'border-top pt-3 mt-2' : 'd-none';
}

function bukaModalSurat(encodedData) {
    dataJemaahSurat = JSON.parse(decodeURIComponent(encodedData));
    document.getElementById('surat-nama-jemaah').innerText = dataJemaahSurat.nama;
    document.getElementById('surat-jenis').value = 'paspor';
    document.getElementById('surat-tgl-cetak').value = new Date().toISOString().split('T')[0];
    document.getElementById('surat-tgl-berangkat').value = ''; 
    
    // Suntik data paspor otomatis jika ada
    document.getElementById('surat-paspor').value = dataJemaahSurat.pasporNo || '';
    
    // Reset toggle TTD digital ke posisi ON (checked)
    const toggleTtd = document.getElementById('surat-pakai-ttd');
    if (toggleTtd) toggleTtd.checked = false;
    
    ubahFormSurat(); // Trigger logika reset form & Auto Nomor
    new bootstrap.Modal(document.getElementById('modalSurat')).show();
}

// ==========================================
// MESIN PENCETAK HTML KE PDF & PENYIMPAN NOMOR
// ==========================================
function applyFormatCss(objFormat) {
    return `color: ${objFormat.color}; font-size: ${objFormat.size}pt; font-family: ${objFormat.font}; font-weight: ${objFormat.bold ? 'bold' : 'normal'}; font-style: ${objFormat.italic ? 'italic' : 'normal'}; text-decoration: ${objFormat.underline ? 'underline' : 'none'}; margin: 2px 0;`;
}

function cetakDokumenSurat(event) {
    event.preventDefault();
    const jenisSurat = document.getElementById('surat-jenis').value;
    const jm = dataJemaahSurat;
    const noSurat = document.getElementById('surat-no').value;
    const tglBerangkat = document.getElementById('surat-tgl-berangkat').value;
    const formatTgl = (t) => t ? new Date(t).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'}) : '-';
    
    // ===============================================
    // MESIN PENYIMPAN NOMOR SURAT KE DATABASE
    // ===============================================
    const matchNo = noSurat.match(/\d+/); 
    if (matchNo) {
        const usedNo = parseInt(matchNo[0], 10);
        const fieldToUpdate = (jenisSurat === 'paspor') ? 'noSR' : 'noSK';
        
        const thnCetak = new Date().getFullYear();
        const isTahunBaru = thnCetak > (konfigurasiSurat.tahunSurat || thnCetak);
        
        let payloadUpdate = {
            [fieldToUpdate]: usedNo,
            tahunSurat: thnCetak // Rekam tahun saat surat ini dicetak
        };
        
        // Update memori lokal
        konfigurasiSurat[fieldToUpdate] = usedNo;
        konfigurasiSurat.tahunSurat = thnCetak;
        
        // BONUS: Jika ini adalah cetakan pertama di tahun baru, otomatis reset juga memori nomor surat jenis lainnya menjadi 0
        if (isTahunBaru) {
            if (jenisSurat === 'paspor') { payloadUpdate.noSK = 0; konfigurasiSurat.noSK = 0; }
            else { payloadUpdate.noSR = 0; konfigurasiSurat.noSR = 0; }
        }

        db.collection("settings").doc("kop_surat").update(payloadUpdate);
    }

    // Baca apakah admin ingin memakai TTD Digital atau Basah
    const pakaiTtd = document.getElementById('surat-pakai-ttd').checked;
    
    const imgKiri = konfigurasiSurat.logoKiri ? `<img src="${konfigurasiSurat.logoKiri}" class="kop-logo-kiri">` : '';
    const imgKanan = konfigurasiSurat.logoKanan ? `<img src="${konfigurasiSurat.logoKanan}" class="kop-logo-kanan">` : '';
    const imgWatermark = konfigurasiSurat.watermark ? `<img src="${konfigurasiSurat.watermark}" class="watermark">` : '';
    
    // Jika toggle menyala DAN ada gambar TTD di pengaturan, maka tampilkan. Jika tidak, kosongkan.
    const imgTtd = (pakaiTtd && konfigurasiSurat.ttd) ? `<img src="${konfigurasiSurat.ttd}" class="ttd-img">` : '';

    let htmlKonten = '';

    // ==========================================
    // TEMPLATE 1: SURAT REKOMENDASI PASPOR
    // ==========================================
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
            <tr><td>Jabatan</td><td>: Direktur Utama ${konfigurasiSurat.nama.text}</td></tr>
            <tr><td>Alamat</td><td>: ${konfigurasiSurat.alamat.text}</td></tr>
        </table>
        <p>Menerangkan:</p>
        <table class="tabel-data">
            <tr><td style="width: 150px;">Nama Lengkap</td><td>: <strong>${jm.nama}</strong></td></tr>
            <tr><td>NIK</td><td>: ${jm.nik || '-'}</td></tr>
            <tr><td>Tetala</td><td>: ${jm.tempatLahir || '-'}, ${formatTgl(jm.tglLahir)}</td></tr>
            <tr><td>Alamat</td><td>: ${jm.alamat || '-'}</td></tr>
        </table>
        <p>Adalah Calon Jamaah Umroh travel kami AL IMRON <strong>${konfigurasiSurat.nama.text}</strong> yang insyaallah akan berangkat melaksanakan ibadah umroh pada tanggal <strong>${tglBerangkat}</strong>. Untuk itu, kami mohon agar nama tersebut diatas, bisa dibantu dalam Proses Pembuatan Passport (Dokumen Perjalanannya), dan kami bertanggung jawab serta menjamin sepenuhnya terhadap calon jamaah umroh kami, dengan memperhatikan hal-hal sebagai berikut:</p>
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
            Hormat kami,<br><strong>${konfigurasiSurat.nama.text}</strong><br>
            ${imgTtd}
            <div class="ttd-nama" style="margin-top: ${imgTtd ? '5px' : '90px'}">NOVI KAMALIA</div>
            <div>Direktur Utama</div>
        </div>`;
    } 
    // ==========================================
    // TEMPLATE 2 & 3: SURAT KETERANGAN (BERANGKAT & BATAL)
    // ==========================================
    else {
        const pkj = document.getElementById('surat-pekerjaan').value;
        const ins = document.getElementById('surat-instansi').value;
        
        let paragrafIsi = '';
        if(jenisSurat === 'berangkat') {
            paragrafIsi = `Adalah benar jemaah umrah TRAVEL AL-IMRON <strong>${konfigurasiSurat.nama.text}</strong> yang insyaallah akan berangkat melaksanakan umroh pada tanggal <strong>${tglBerangkat}</strong>. Untuk itu, kami mohon kiranya dapat diberikan izin untuk menunaikan ibadah umroh.`;
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
            <p>Adalah benar jemaah umrah TRAVEL AL-IMRON <strong>${konfigurasiSurat.nama.text}</strong> yang semula dijadwalkan akan berangkat untuk melaksanakan ibadah umrah pada tanggal <strong>${tglBerangkat}</strong>.</p>
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
            <tr><td>Jabatan</td><td>: Direktur ${konfigurasiSurat.nama.text}</td></tr>
            <tr><td>Alamat Kantor</td><td>: ${konfigurasiSurat.alamat.text}</td></tr>
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
                <div style="${applyFormatCss(konfigurasiSurat.nama)}">${konfigurasiSurat.nama.text}</div>
                <div style="${applyFormatCss(konfigurasiSurat.sub)}">${konfigurasiSurat.sub.text}</div>
                <div style="${applyFormatCss(konfigurasiSurat.alamat)}">${konfigurasiSurat.alamat.text}</div>
            </div>
            <div style="width: 95px; text-align: right;">${imgKanan}</div>
        </div>
        <div class="content">${htmlKonten}</div>
        <script>setTimeout(() => { window.print(); }, 800);</script>
    </body></html>`);
    printWin.document.close();
    bootstrap.Modal.getInstance(document.getElementById('modalSurat')).hide();
}