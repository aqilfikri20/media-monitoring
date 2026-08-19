# media-monitoring
Media Monitoring adalah aplikasi untuk mengelola, mencari, dan memantau mention/artikel dari berbagai sumber media.Aplikasi ini menyediakan fitur bulk ingest, pencarian artikel, filtering, sorting, pagination, dan statistik untuk kebutuhan dashboard monitoring.

# Demo
- Frontend: https://media-project.australiaeast.cloudapp.azure.com
- Backend API : https://media-project.australiaeast.cloudapp.azure.com/api
  
# Instalation
- git clone https://github.com/aqilfikri20/media-monitoring.git
- cd media-monitoring
- docker compose build
- docker compose up -d

check status & logs (optional):
- docker compose ps
- docker compose logs

# Requirements
- docker
- docker compose
- git

# Tech Stack
Frontend :
- HTML
- CSS
- Javascript

Backend:
- Node.js
- Typesript
- Express.js
- Postgres

# Infrastructure
- Docker
- Docker Compose
- Nginx
- Azure VM 

# Features
1. Bulk Ingest
endpoint:
POST /internal/mentions/bulk
example:
POST /internal/mentions/bulk`

3. Search
endpoint:
GET /mentions
example:
GET /mentions?q=ringgit

4. Source Filter
example:
GET /mentions?source=Reuters

5. Date Range
example:
GET /mentions?from=2026-08-01&to=2026-08-19

6. Sorting
GET /mentions?sort=published_at&order=desc

7. Pagination
example:
GET /mentions?page=2

8. Show Statistics
endpoint:
GET /mentions/stats
example:
GET /mentions/stats?group_by=source
GET /mentions/stats?group_by=day

# Schema Project
dibuat menjadi dua folder sederhana yang memisahkan frontend dan backend
backend/
frontend/

Isi backend/
migration/ 
==> dipisahkan dari source code karena migration digunakan untuk mengelola perubahan struktur database secara terkontrol dan dapat dilacak melalui Git.
backend/src/
==> berisi kode sumber utama aplikasi sehingga terpisah dari file konfigurasi seperti package.json, tsconfig.json, dan Dockerfile.

isi frontend/
hanya berisi 3 file karena hanya ingin membangun tampilan sederha
index.html
style.css
script.js

# DATA PROCESSING
Data Processing saya pisahkan menjadi 3 tahap berurutan
- Normalisasi (Normalization)
- Penanganan Nilai Kosong (Missing Value Handling)
- Menghapus Duplikasi (Duplicate Removal)

Dari tahapan tersebut mungkin akan timbul pertanyaan. 
Kenapa urutan seperti itu? kenapa Missing value Handling diurutan kedua, dan sebagainya.
Alasan saya membuat sepeti itu karena agar tidak kehilangan data penting yang mungkin akan berguna. 

1. Normalization
   Normaliasasi ditahap pertama akan memperbaiki semua data tanpa menghapus data atau menghapus nilainya. Karena kemungkinan data tersebut mengandung nilai yang penting, maka data hanya akan ditangani dan dipertahankan isinya.
   
Proses Normalization:
- Menghapus tag HTML, Menghapus elemen <script> dan <style> jika ditemukan.
- Mengubah HTML entity menjadi karakter sebenarnya. contoh &nbsp menjadi spasi, &quot menjadi (")
- Menggabungkan spasi berlebih menjadi satu spasi.
- Menghapus spasi di awal dan akhir teks (trim).
- Mengubah nilai kosong, (""), atau ('') menjadi null.
- Mengubah penulisan source yang rusak menjadi nama yang sebenarnya. Contohnya "the star" menjadi "The Star", atau "thestar" menjadi "The Star". Jika source tidak ada di mapping maka source hanya akan diubah huruf pertama menjadi kapital.
- Menghapus tanda koma pada angka. Misal 1,500 menjadi 1500.
- Jika Nilai angka ada string misal "1500", makan akan diubah menjadi 1500
- Dan jika nilai angka yang dinormalisasi tidak valid maka akan menghasilkan null
- Menangangani format tanggal, dan mengkonversi semua menjadi format DD/MM/YYYY
- Jika tanggal tidak cocok maka akan menghasilkan null

2. Missing Value Handling
   Penanganan nilai kosong saya lakukan diurutan kedua karena bisa saja ada kemungkinan diantara data yang didalamnya memiliki nilai yang null, ada nilai penting lain di dalamnya. Contoh:
Data 1
  source: The Star
  content: Ringgit Strengthens
  url: https://www.thestar.com.my/business

Data 2
  source: null
  content: The ringgit opened higher against the greenback on Monday
  url: https://www.thestar.com.my/business
 
Data 3
  source: The Star
  content: null
  url: https://www.thestar.com.my/business

Dari contoh data tersebut dapat dilihat bahwa Data 2 membawa nilai content yang lebih lengkap. Jadi Kita tidak boleh melakukan penghapusan duplikasi terlebih dahulu, walaupun ada Data 1 dengan value tanpa nilai null. Oleh karena itu semua nilai null pada data harus diisi semua, dan selanjutnya akan dilakukan proses penghapusan duplikasi. 

Proses Missing Value Handling:
Data dengan nilai null akan dicari duplikat nya diantara semua. kemudian nilai null akan diisi dengan data duplikat. pencarian duplikat ini berdasarkan 3 value dengan berurutan.
- pertama akan dicari berdasarkan external_id apakah diantara data apakah ada yang sama. external_id adalah kandidat pertama yang kemungkinan besar pasti ada didata. proses ini adalah yang paling mudah dan hemat pemrosesasan, sehingga saya tempatkan di urutan yang sama. Jika tidak ada yang sama, maka akan di lakukan proses selanjutnya
- Kedua akan dicari berdasarkan url. url adalah kandidat terkuat kedua yang berpotensi ada dan juga hemat pemrosesan. Jika url tidak ada yang sama, maka akan dilakukan proses selanjutnya.
- Ketiga akan dicari berdasarkan content, dimana akan dicari kesamaan dengan mengambil 7 kata pertama konten. sehingga akan dicari dengan 7 kata pertama yang sama.
  
Jika data masih memiliki nilai null setelah dicari berdasarkan duplikasi. Maka akan dibuat nilai baru dan data diusahan untuk dipertahankan karena kemungkinan akan berguna pada untuk statistik. prosesnya berurutan yaitu dengan cara:
- external_id dengan nilai null akan dibuat nilai baru dengan id unik sendiri menggunakan randomUUID.
- source dengan nilai null akan dibuat "Unknown"
- author dengan null akan dibuat "Anonymous"
- title dengan nilai null akan dibuat judul baru dengan mengambil isi dari dari content dengan aturan mengambil 1 kalimat pertama atau diambil sampai tanda baca (!; ?; dsb) dan emoji. Kemudian menghapus emoji pada judul jika ditemukan.
- jika title masih ditemukan null karena content juga null, maka akan dibuat "untitled"
- content dengan nilai null akan diisi menuju ke url. Contoh isi content menjadi "Visit to https://example.com/article"
- url dengan nilai null akan membuat url yang mengarah pencari ke google sesuai title.
- jika data memiliki content dan url dengan nilai null, maka data akan dihapus. tanpa url ataupun isi content data dianggap tidak valid
- engagement dengan nilai null, maka akan dibuat angka baru dengan menghitung rata-rata semua engagement dari data
- published_at dengan nilai null akan menggunakan tanggal dan waktu saat proses ini dilakukan.

3. Duplicate Removal
Ini adalah tahap akhir pemrosesan data. Metode pengecekan duplikat berdasarkan duplikat URL dan Berdasarkan 7 kata pertama content. aturannya yaitu:
- Data dengan url dan 7 kata awal dalam content yang sama dianggap sebagai duplicate.
- Data dengan url sama tapi content berbeda, begitu pula sebaliknya, maka akan dipilih content terpanjang. karena saya asumsikan content yang panjang lebih orisinil dan terpercaya

# Duplication Verification
Setelah proses deduplikasi selesai, setiap record yang tersisa dibuatkan "dedupe_key" dari url untuk dilakukan verifikasi duplikasi lebih lanjut. Varifikasi duplikasi ini dilakukan apabila terjadi kasus file yang sama dikirim 2 kali, atau kasus file kedua yang dikirim memiliki data yang sama di database. Untuk menangani hal tersebut dilakukan dengan aturan:
- Jika belum ada, dilakukan INSERT ke database
- Jika sudah ada, tetapi datanya berbeda, data yang dipilih sebelumnya dilakukan UPDATE ke database
- JIka sudah ada dan datanya sama maka tidak ada perubahan yang terjadi dan data dihitung sebagai UNCHANGED.
Jika terdapat perbedaan nilai, record yang sudah ada di database dilakukan UPDATE menggunakan data terbaru.


# Time Spent
waktu yang dihabiskan 28 jam
- sesi pertama dimulai dari recruiter mengirim pengumuman seleksi Senin 15.20 WIB, saya membaca informasi, dokumentasi dan apa saja yang dibutuhkan. Sekitar 15 menit setelah itu saya memulai coding, yaitu sekitar pukul 15.35 sampai sekitar 02.00 WIB. Total sekitar 10 Jam
- Sesi kedua dimulai Selasa pukul 09.00 sampai pukul 13.00. Total sekitar 4 Jam.
- Sesi Ketiga Selasa, pukul 19.00 sampai sekitai 23.59. Total sekitar 5 jam.
- Sesi Keempat Rabu, pukul 08.00 sampai 11.00. Total sekitar 3 jam
- Sesi Kelima Rabu, Pukul 15.00 sampai 18.00. Total sekitar 3 jam
- Total Waktu yang dibutuhkan 25 Jam

# Perbaikan Jika Diberi waktu 1 minggu lagi
- Perbaikan di Frontend yang menurut saya masih tidak menarik.
- Menambahkan validasi dan error handling yang lebih lengkap, baik pada frontend maupun backend, sehingga error dapat ditangani dengan lebih jelas.
- Melakukan optimasi database, terutama pada query pencarian dan duplicate detection apabila jumlah data semakin besar
- Meningkatkan keamanan aplikasi, seperti validasi input, pengelolaan environment variable, dan pembatasan akses terhadap endpoint tertentu.





