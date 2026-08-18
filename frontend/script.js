const uploadFile = document.getElementById("upload-file");
const fileInput = document.getElementById("file");
const uploadStatus = document.getElementById("upload-status");
const articleList = document.getElementById("article-list");

const API_URL = "http://localhost:3000";

uploadFile.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = fileInput.files[0];

    if (!file) {
        uploadStatus.textContent =
            "Pilih file JSON terlebih dahulu.";
        return;
    }

    try {
        uploadStatus.textContent =
            "Sedang memproses file...";

        const text = await file.text();
        const data = JSON.parse(text);

        if (!Array.isArray(data)) {
            throw new Error(
                "Format JSON harus berupa array."
            );
        }

        const response = await fetch(
            `${API_URL}/internal/mentions/bulk`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Upload gagal."
            );
        }

        uploadStatus.textContent =
            `Berhasil: ${result.inserted} baru, ` +
            `${result.updated} diperbarui, ` +
            `${result.unchanged} Data tidak berubah.`;

        loadArticles();

    } catch (error) {
        console.error(error);

        uploadStatus.textContent =
            error.message ||
            "Terjadi kesalahan.";
    }
});