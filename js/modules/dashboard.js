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
    
    if (typeof chartPaket !== 'undefined' && chartPaket !== null) {
        chartPaket.destroy();
    }

    const labelPaket = Object.keys(dataPaket);
    const jumlahPaket = Object.values(dataPaket);

    if (labelPaket.length === 0) {
        labelPaket.push("Belum ada data");
        jumlahPaket.push(1); 
    }

    chartPaket = new Chart(ctx, {
        type: 'doughnut',
        // MENDAFTARKAN PLUGIN ANGKA
        plugins: [ChartDataLabels], 
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
            maintainAspectRatio: false, 
            cutout: '60%', // Lubang diperkecil sedikit agar angka muat
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: { 
                        usePointStyle: true, 
                        boxWidth: 8,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.label === "Belum ada data") return " 0 Jemaah";
                            return ` ${context.label}: ${context.raw} Jemaah`;
                        }
                    }
                },
                // KONFIGURASI ANGKA YANG MUNCUL DI ATAS WARNA
                datalabels: {
                    color: '#000000', // Teks warna putih agar kontras
                    font: {
                        weight: 'bold',
                        size: 14 // Ukuran font angka
                    },
                    formatter: function(value, context) {
                        // Sembunyikan angka jika tabel dasbor sedang kosong
                        if (context.chart.data.labels[context.dataIndex] === "Belum ada data") {
                            return null;
                        }
                        // Jika ingin menampilkan teks "15 Org", ubah menjadi: return value + " Org";
                        return value; 
                    }
                }
            }
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