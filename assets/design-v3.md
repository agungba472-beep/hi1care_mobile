# 🎨 Dokumen Spesifikasi Desain & Arsitektur Antarmuka WEAR
**WEAR (Web-Based ARV Adherence Tracker)** *Versi V3 - Diperbarui berdasarkan Referensi Blueprint File PDF WEAR*

---

## 📑 Daftar Isi
1. [Filosofi Desain & Standar Keamanan Klinis](#1-filosofi-desain--standar-keamanan-klinis)
2. [Identitas Visual & Palet Warna](#2-identitas-visual--palet-warna)
3. [Manajemen Aset & Tata Letak Dasar](#3-manajemen-aset--tata-letak-dasar)
4. [Spesifikasi Layar Mobile (Figma/PDF Aligned)](#4-spesifikasi-layar-mobile-figmapdf-aligned)
5. [Spesifikasi Tampilan Web Admin Monitoring](#5-spesifikasi-tampilan-web-admin-monitoring)
6. [Aliran Logika Fitur Utama](#6-aliran-logika-fitur-utama)

---

## 1. 🛡️ Filosofi Desain & Standar Keamanan Klinis

Sesuai dengan blueprint dari rancangan UI terbaru, WEAR mengusung konsep **"Privasi Diutamakan" (Privacy First)** dan **Empati Radikal**. Karena menyangkut data sensitif pasien ODHA, desain antarmuka memprioritaskan keamanan dengan menampilkan pesan-pesan penenang (reassurance) di berbagai layar.

* **Enkripsi Standar Klinis (End-to-End Encryption):** Data rekam medis dan identitas pasien diamankan.
* **Tanpa Log Biometrik:** Pemindaian sidik jari/wajah hanya menggunakan keamanan lokal perangkat (Local Authentication) tanpa menyimpan log biometrik di server utama.

---

## 2. 🟩 Identitas Visual & Palet Warna

Skema warna dirancang memiliki tingkat kontras yang tegas untuk aksesibilitas, dengan dominasi Hijau Hutan (*Forest Green*) yang elegan.

| Komponen UI | Representasi Warna | Kode HEX | Implementasi pada Elemen |
| :--- | :---: | :---: | :--- |
| **Primary (Tebal)** | 🌲 Deep Forest Green | `#012D1D` | Top Header Bar, Tombol Aksi Utama, Teks Judul Layar |
| **Secondary** | 🟢 Mint Medical Green | `#00A86B` | Ikon Navigasi Bawah, Border Penanda, Indikator Kenaikan Kepatuhan |
| **Warning** | 🟨 Amber Yellow | `#FFC107` | Peringatan Kepatuhan Sedang / Tunda |
| **Danger** | 🟥 Crimson Red | `#DC3545` | Indikator Lonceng Merah, Peringatan Telat Parah |
| **Background Base**| ⬜ Clean Surface | `#FAFAFA` | Warna Dasar Canvas Aplikasi |

---

## 3. 🖼️ Manajemen Aset & Tata Letak Dasar

Penyimpanan aset grafis diletakkan pada folder `/assets/img/`.
* **`logo_wear.jpeg`**: Logo aplikasi diletakkan secara terpusat pada halaman Otentikasi (Masuk & Daftar) dan Pemindaian Biometrik.
* **`bg_obat.jpeg`**: Diterapkan sebagai `<ImageBackground>` dengan *opacity* sangat rendah (0.05 - 0.1) untuk memberikan kesan bertekstur medis tanpa mendistraksi elemen teks.

---

## 4. 📱 Spesifikasi Layar Mobile (Figma/PDF Aligned)

Sesuai dengan detail spesifik pada dokumen desain PDF, berikut adalah kerangka layar aplikasinya:

### 🔑 4.1 Halaman Daftar & Masuk Akun
* **Register (`RegisterScreen.tsx`):**
    * *Copywriting:* "Masuki ruang aman untuk perjalanan kesehatan Anda."
    * *Field Input:* **No. Registrasi Puskesmas** (wajib untuk sinkronisasi Faskes), Email, Nama Pengguna, dan Kata Sandi.
* **Login (`LoginScreen.tsx`):**
    * *Copywriting:* "Selamat datang kembali. Data kesehatan Anda terenkripsi dan aman."
    * *Field Input:* Username/Email dan Kata Sandi.

### 🔐 4.2 Halaman Autentikasi Biometrik (`BiometricAuthScreen.tsx`)
* **Tampilan:** Ikon sensor sidik jari besar di tengah.
* **Keamanan:** Memunculkan teks "TANPA LOG BIOMETRIK" dan "ENKRIPSI END-TO-END" untuk kenyamanan psikologis pasien.
* **Bypass:** Tersedia opsi "Masuk dengan Kata Sandi" sebagai *fallback* jika sensor HP rusak.

### 🏠 4.3 Dashboard Utama (`DashboardScreen.tsx`)
* **Sapaan Personal:** "Hello, [Nama Pasien]" (contoh: *Hello, Patient User*).
* **Indikator Adherence (Kepatuhan):** Menampilkan persentase besar (contoh: **98%**) lengkap dengan indikator dinamika mingguan (contoh: `+2% dari minggu lalu`).
* **Bottom Navigation:** Terdiri dari 5 menu utama: **Home, Alarm, Edukasi, Chat, Profile**.

### 🔔 4.4 Halaman Notifikasi (`NotificationListScreen.tsx`)
* **Sistem Kategori:** Dipisah berdasarkan "TERBARU" dan "SEBELUMNYA".
* **Jenis Notifikasi:**
    * *Pengingat Obat:* "Waktunya minum ARV (Dosis 1). Tetap semangat!"
    * *Pesan Faskes:* Integrasi hasil lab (contoh: "Pesan baru dari Klinik Mentari: Hasil lab Anda sudah tersedia").
    * *Edukasi:* Menerima *broadcast* tips kesehatan secara *real-time*.

### 💬 4.5 Fitur AI & Konsultasi (`PatientChatRoomScreen.tsx` / Chatbot)
* **WEAR AI:** Fitur obrolan dengan bot AI untuk edukasi otomatis (contoh: "Ada yang bisa saya bantu mengenai terapi ARV?"). Mampu memberikan tips seperti kelola stres dan nutrisi.
* **Chat Nakes:** Memungkinkan kirim lampiran (foto fisik efek samping) langsung ke perawat/admin di fasilitas kesehatan.

### 👤 4.6 Halaman Profil Pasien (`ProfileScreen.tsx`)
* **Kartu Identitas Digital:** Menampilkan ID (contoh: `HI-2024-001`), Status Pasien (contoh: `Aktif Pasien Rutin`), dan *Adherence Score*.
* **Informasi Pribadi:** Nama Lengkap, Tanggal Lahir, dan Nomor Registrasi Faskes (contoh: `PKM-JKT-99283-00`).

---

## 5. 💻 Spesifikasi Tampilan Web Admin Monitoring

### 📊 5.1 Dashboard Monitoring Admin (`dashboard.blade.php`)
* **Visual Konsisten:** Tetap menggunakan aksen `#012D1D` untuk penyeragaman desain sistem.
* **Data Dinamis:** Tabel "Pasien Terbaru" terurut menggunakan `latest()` dan mengambil data relasi lengkap tanpa *dummy*.
* **Panel Legend Kepatuhan:** Alert Bootstrap di bagian bawah grafik yang menjelaskan arti warna indikator kepatuhan.

### 📸 5.2 Viewer Bukti Foto (Modal Fix) (`pasien_detail.blade.php`)
* Menggunakan fitur **Bootstrap Modal Pop-up** secara elegan (z-index disesuaikan di luar tabel) agar admin dapat melihat foto bukti minum obat dan bukti efek samping tanpa membuka tab baru (mencegah *Backdrop Freeze*).

---

## 6. ⚙️ Aliran Logika Fitur Utama

1. **Closed-Loop Validation & Gembok Waktu:**
   Tombol *Refill* dilindungi oleh sistem anti-spam. Jika pasien mengklik tombol tanpa melampirkan foto sisa obat, pengajuan otomatis ditolak (`validation error`).
2. **Push Notifications:**
   Data notifikasi (Lonceng Merah) terintegrasi dengan tabel `notifikasi`. Lonceng direset ke `0` secara instan menggunakan `useFocusEffect` saat halaman notifikasi terbuka.
3. **Penyimpanan Gambar Multipark:**
   Semua fungsi *upload* (foto bukti, cover edukasi) menembak API Laravel via method `POST multipart/form-data`, file diletakkan di `storage/app/public/` dan diamankan dengan `storage:link`.

*Dokumen V3 ini disusun secara presisi menyesuaikan struktur file PDF WEAR Project 2.*
