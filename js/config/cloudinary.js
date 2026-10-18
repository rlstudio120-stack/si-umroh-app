// js/config/cloudinary.js

const CLOUD_NAME = "h8p2mssb"; 
const UPLOAD_PRESET = "berkas_umroh_app"; // Contoh: berkas_umroh_app

/**
 * Fungsi untuk mengunggah file fisik ke Cloudinary secara langsung
 * @param {File} fileFisik - Objek file dari input type="file"
 * @returns {Promise<string|null>} - Mengembalikan URL aman file atau null jika gagal
 */
async function uploadKeCloudinary(fileFisik) {
  if (!fileFisik) return null;

  const formData = new FormData();
  formData.append('file', fileFisik);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
        throw new Error("Gagal mengunggah file ke Cloudinary");
    }

    const data = await response.json();
    return data.secure_url; 
  } catch (error) {
    console.error("Error Upload Cloudinary:", error);
    return null;
  }
}