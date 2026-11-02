// Variabel global untuk menyimpan instance grafik agar tidak menumpuk saat direfresh
let chartPaket = null;

function loadDashboardData() {
    // 1. Hitung Total Paket Aktif
    db.collection("paket").get().then((snapshot) => {
        document.getElementById('stat-paket').innerText = snapshot.size;
    });

    // 2. Ambil Data Jemaah untuk Statistik, Grafik, dan Tabel Terbaru
    db.collection("jemaah").get().then((snapshot) => {
        let totalJemaah = 0;
        let menunggu = 0;
        let siap = 0;
        
        // Objek untuk menghitung jumlah jemaah per paket
        let hitungPaket = {};
        
        // Array untuk menampung pendaftar terbaru
        let dataTerbaru = [];

        snapshot.forEach((doc) => {
            const jm = doc.data();
            totalJemaah++;
            
            // Hitung status
            if (jm.status === 'Menunggu Verifikasi') menunggu++;
            if (jm.status === 'Siap Berangkat' || jm.status === 'Disetujui') siap++;

            // Hitung komposisi paket
            const namaPaket = jm.paket || 'Tanpa Paket';
            if (hitungPaket[namaPaket]) {
                hitungPaket[namaPaket]++;
            } else {
                hitungPaket[namaPaket] = 1;
            }

            // Kumpulkan data untuk tabel (simpan timestamp pendaftaran jika ada, di sini kita kumpulkan semua dulu)
            dataTerbaru.push(jm);
        });

        // Update angka di kartu statistik
        document.getElementById('stat-total-jemaah').innerText = totalJemaah;
        document.getElementById('stat-menunggu').innerText = menunggu;
        document.getElementById('stat-siap').innerText = siap;

        // Render Grafik Pie
        renderGrafikPaket(hitungPaket);

        // Render Tabel 5 Pendaftar Terbaru (Ambil 5 dari belakang)
        renderTabelTerbaru(dataTerbaru.slice(-5).reverse());
    }).catch(error => {
        console.error("Gagal memuat dashboard:", error);
    });
}

function renderGrafikPaket(dataPaket) {
    const ctx = document.getElementById('grafikPaket').getContext('2d');
    
    // Hancurkan grafik lama jika halaman direfresh agar tidak tumpang tindih
    if (chartPaket) {
        chartPaket.destroy();
    }

    const labelPaket = Object.keys(dataPaket);
    const jumlahPaket = Object.values(dataPaket);

    // Jika tidak ada data, beri grafik kosong
    if (labelPaket.length === 0) {
        labelPaket.push("Belum ada data");
        jumlahPaket.push(1);
    }

    chartPaket = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labelPaket,
            datasets: [{
                data: jumlahPaket,
                backgroundColor: [
                    '#0d6efd', '#ffc107', '#198754', '#0dcaf0', '#6f42c1', '#d63384'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '70%' // Membuat lubang di tengah agar berbentuk donat
        }
    });
}

function renderTabelTerbaru(dataJemaah) {
    const tbody = document.getElementById('tbody-terbaru');
    let html = '';

    if (dataJemaah.length === 0) {
        html = '<tr><td colspan="3" class="text-center text-muted">Belum ada pendaftar.</td></tr>';
    } else {
        dataJemaah.forEach(jm => {
            let badgeColor = 'bg-secondary';
            if (jm.status === 'Menunggu Verifikasi') badgeColor = 'bg-warning text-dark';
            else if (jm.status === 'Siap Berangkat' || jm.status === 'Disetujui') badgeColor = 'bg-success';

            html += `
            <tr>
                <td class="fw-bold">${jm.nama || '-'}</td>
                <td><small class="text-muted">${jm.paket || '-'}</small></td>
                <td><span class="badge ${badgeColor}">${jm.status || '-'}</span></td>
            </tr>
            `;
        });
    }
    tbody.innerHTML = html;
}

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