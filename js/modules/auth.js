// js/modules/auth.js

// ==========================================
// 1. PENJAGA SESI HALAMAN (GLOBAL OBSERVER)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const sesi = sessionStorage.getItem('siUmrohUser');
    const isLoginPage = window.location.pathname.includes('login.html');
    const isAdminPage = window.location.pathname.includes('admin.html');

    // Tendang ke admin jika sudah login
    if (sesi && isLoginPage) {
        window.location.href = 'admin.html';
    } 
    // Tendang ke login jika belum login tapi memaksa masuk admin
    else if (!sesi && isAdminPage) {
        window.location.href = 'login.html';
    }
});


// ==========================================
// 2. MESIN LOGIN & LOGOUT
// ==========================================
async function prosesLogin(event) {
    event.preventDefault();
    const btn = document.getElementById('btnLogin');
    const username = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memeriksa...';

    try {
        const doc = await db.collection("pengguna").doc(username).get();
        
        if (!doc.exists) {
            Swal.fire('Akses Ditolak', 'Username tidak ditemukan.', 'error');
            return;
        }

        const data = doc.data();

        if (data.status === 'Nonaktif') {
            Swal.fire('Diblokir', 'Akun Anda sedang dinonaktifkan. Hubungi Super Admin.', 'error');
            return;
        }

        // Validasi Password
        if (data.password !== btoa(password)) {
            Swal.fire('Gagal', 'Password yang Anda masukkan salah.', 'error');
            return;
        }

        // Simpan sesi ke browser
        sessionStorage.setItem('siUmrohUser', JSON.stringify({
            username: username,
            nama: data.nama || 'Pengelola',
            role: data.role
        }));

        window.location.href = 'admin.html';

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Masuk ke Dashboard <i class="bi bi-box-arrow-in-right ms-2"></i>';
    }
}

window.logoutAdmin = function(event) {
    if(event) event.preventDefault();
    Swal.fire({
        title: 'Yakin ingin keluar?',
        text: "Sesi Anda akan diakhiri.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Keluar!'
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.removeItem('siUmrohUser');
            window.location.href = 'login.html';
        }
    });
};


// ==========================================
// 3. MESIN PEMBAGI HAK AKSES (ROLE)
// ==========================================
function terapkanHakAkses() {
    const sesi = sessionStorage.getItem('siUmrohUser');
    if (!sesi) return;

    const user = JSON.parse(sesi);
    
    // Ubah nama di sidebar
    document.querySelectorAll('.sidebar-header h6').forEach(el => el.innerText = user.nama);
    document.querySelectorAll('.sidebar-header small').forEach(el => el.innerText = user.role.toUpperCase());

    // Batasi Akses Sesuai Role
    if (user.role === 'kasir') {
        sembunyikanMenu('jemaah');
        sembunyikanMenu('dokumen');
        sembunyikanMenu('surat');
        sembunyikanMenu('keberangkatan');
        sembunyikanMenu('paket');
        sembunyikanMenu('users');
        sembunyikanTombolBerbahaya();
    } else if (user.role === 'admin') {
        sembunyikanMenu('paket');
        sembunyikanMenu('users');
        sembunyikanTombolBerbahaya();
    }
}

function sembunyikanMenu(viewId) {
    document.querySelectorAll(`[onclick*="switchView('${viewId}')"]`).forEach(el => {
        el.style.display = 'none';
        el.classList.remove('d-flex'); // Hapus class flex jika ada agar benar-benar hilang
    });
}

function sembunyikanTombolBerbahaya() {
    document.querySelectorAll('[onclick*="injectDummyJemaah()"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('[onclick*="hapusSeluruhDataJemaah()"]').forEach(el => el.style.display = 'none');
}


// ==========================================
// 4. MESIN MANAJEMEN USER (SIMPAN, BACA, HAPUS, EDIT)
// ==========================================
async function simpanAkunAdmin(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-simpan-admin');
    const nama = document.getElementById('reg-nama').value.trim(); 
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    if (/\s/.test(username)) {
        Swal.fire('Salah', 'Username tidak boleh menggunakan spasi!', 'error'); return;
    }

    btn.disabled = true; btn.innerHTML = 'Menyimpan...';

    try {
        const cekUsername = await db.collection("pengguna").doc(username).get();
        if (cekUsername.exists) {
            Swal.fire('Gagal', 'Username sudah dipakai.', 'warning');
            btn.disabled = false; btn.innerHTML = 'Simpan Akun'; return;
        }

        await db.collection("pengguna").doc(username).set({
            nama: nama, username: username, password: btoa(password), role: role, status: 'Aktif', createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        Swal.fire('Berhasil!', `Username: ${username} ditambahkan.`, 'success');
        document.getElementById('form-tambah-admin').reset();
        bootstrap.Modal.getInstance(document.getElementById('modalTambahAdmin')).hide();
        loadDataUsers();
    } catch (error) { Swal.fire('Error', error.message, 'error'); } 
    finally { btn.disabled = false; btn.innerHTML = 'Simpan Akun'; }
}

async function loadDataUsers() {
    const tbody = document.getElementById('data-users');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Memuat data...</td></tr>';

    try {
        const snap = await db.collection("pengguna").orderBy("createdAt", "desc").get();
        let html = '';
        if (snap.empty) { html = '<tr><td colspan="4" class="text-center py-4">Belum ada data.</td></tr>'; } 
        else {
            snap.forEach(doc => {
                const data = doc.data(); const username = doc.id;
                const nama = data.nama || 'Tanpa Nama'; 
                const role = data.role === 'superadmin' ? 'Super Admin' : (data.role === 'admin' ? 'Staf Admin' : 'Kasir');
                let badgeStyle = data.role === 'superadmin' ? 'background-color: #f3e8ff; color: #7e22ce;' : (data.role === 'admin' ? 'background-color: #e0f2fe; color: #0369a1;' : 'background-color: #dcfce7; color: #15803d;');
                badgeStyle += ' padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 11px;';
                const statusHtml = data.status === 'Aktif' ? '<span class="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-3">Aktif</span>' : '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger rounded-pill px-3">Nonaktif</span>';

                html += `<tr>
                    <td><span style="${badgeStyle}">${role}</span></td>
                    <td><div class="fw-bold">${nama}</div><div class="text-muted small">Username: ${username}</div></td>
                    <td class="text-center">${statusHtml}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary border-0 me-1" onclick="editUser('${username}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="hapusUser('${username}')"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
            });
        }
        tbody.innerHTML = html;
    } catch (error) { tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Error: ${error.message}</td></tr>`; }
}

async function hapusUser(username) {
    Swal.fire({ title: 'Hapus Akun?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus!' }).then(async (result) => {
        if (result.isConfirmed) {
            await db.collection("pengguna").doc(username).delete();
            Swal.fire('Terhapus!', 'Akun dihapus.', 'success');
            loadDataUsers();
        }
    });
}

async function editUser(username) {
    Swal.fire({ title: 'Memuat...', didOpen: () => Swal.showLoading() });
    const doc = await db.collection("pengguna").doc(username).get();
    const data = doc.data();
    document.getElementById('edit-reg-nama').value = data.nama || '';
    document.getElementById('edit-reg-username').value = username;
    document.getElementById('edit-reg-password').value = ''; 
    document.getElementById('edit-reg-role').value = data.role || 'kasir';
    document.getElementById('edit-reg-status').value = data.status || 'Aktif';
    Swal.close();
    new bootstrap.Modal(document.getElementById('modalEditAdmin')).show();
}

async function simpanEditAdmin(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-update-admin');
    const username = document.getElementById('edit-reg-username').value;
    const updateData = {
        nama: document.getElementById('edit-reg-nama').value.trim(),
        role: document.getElementById('edit-reg-role').value,
        status: document.getElementById('edit-reg-status').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const pass = document.getElementById('edit-reg-password').value;
    if (pass) updateData.password = btoa(pass);

    btn.disabled = true; btn.innerHTML = 'Menyimpan...';
    try {
        await db.collection("pengguna").doc(username).update(updateData);
        Swal.fire('Berhasil!', 'Data diperbarui.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalEditAdmin')).hide();
        loadDataUsers(); 
    } catch (err) { Swal.fire('Error', err.message, 'error'); } 
    finally { btn.disabled = false; btn.innerHTML = 'Update Data Akun'; }
}