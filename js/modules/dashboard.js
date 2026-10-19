// js/modules/dashboard.js

function loadDashboardData() {
    // 1. Ambil dan hitung statistik Jemaah
    db.collection("jemaah").get().then((snapshot) => {
        let total = snapshot.size;
        let menunggu = 0;
        let siap = 0;

        snapshot.forEach(doc => {
            const status = doc.data().status;
            if (status === 'Menunggu Verifikasi') menunggu++;
            else if (status === 'Siap Berangkat') siap++;
        });

        // Tampilkan ke layar dengan efek animasi angka (opsional tapi elegan)
        animateValue("dashTotalJemaah", 0, total, 1000);
        animateValue("dashMenunggu", 0, menunggu, 1000);
        animateValue("dashSiap", 0, siap, 1000);

    }).catch((error) => {
        console.error("Gagal memuat data jemaah untuk dashboard:", error);
    });

    // 2. Ambil dan hitung statistik Paket Aktif
    db.collection("paket").where("status", "==", "Aktif").get().then((snapshot) => {
        animateValue("dashTotalPaket", 0, snapshot.size, 1000);
    }).catch((error) => {
        console.error("Gagal memuat data paket untuk dashboard:", error);
    });
}

// Fungsi kecil untuk membuat efek animasi saat angka berubah
function animateValue(id, start, end, duration) {
    if (start === end) {
        document.getElementById(id).innerText = end;
        return;
    }
    let range = end - start;
    let current = start;
    let increment = end > start ? 1 : -1;
    let stepTime = Math.abs(Math.floor(duration / range));
    let obj = document.getElementById(id);
    let timer = setInterval(function() {
        current += increment;
        obj.innerText = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}