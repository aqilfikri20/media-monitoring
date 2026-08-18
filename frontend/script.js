const uploadFile = document.getElementById("upload-file");
const fileInput = document.getElementById("file");
const uploadStatus = document.getElementById("upload-status");
const articleList = document.getElementById("article-list");
const searchInput =document.getElementById("search-input");
const searchButton =document.getElementById("search-button");
const sourceFilter =document.getElementById("source-filter");
const sortFilter =document.getElementById("sort-filter");
const fromDate =document.getElementById("from-date");
const toDate =document.getElementById("to-date");
const API_URL = "http://localhost:3000";

function resetPageAndLoad() {
    currentPage = 1;
    loadArticles();
}

searchButton.addEventListener(
    "click",
    resetPageAndLoad
);

searchInput.addEventListener(
    "keydown",
    (event) => {
        if (event.key === "Enter") {
            resetPageAndLoad();
        }
    }
);

fromDate.addEventListener(
    "change",
    resetPageAndLoad
);

toDate.addEventListener(
    "change",
    resetPageAndLoad
);

sourceFilter.addEventListener(
    "change",
    resetPageAndLoad
);

sortFilter.addEventListener(
    "change",
    resetPageAndLoad
);

fromDate.addEventListener(
    "change",
    resetPageAndLoad
);

toDate.addEventListener(
    "change",
    resetPageAndLoad
);

sourceFilter.addEventListener(
    "change",
    resetPageAndLoad
);

sortFilter.addEventListener(
    "change",
    resetPageAndLoad
);

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

async function loadSources() {
    const response = await fetch(
        `${API_URL}/mentions/sources`
    );

    if (!response.ok) {
        throw new Error(
            "Gagal mengambil source."
        );
    }

    const result =
        await response.json();

    sourceFilter.innerHTML = `
        <option value="">
            All Sources
        </option>
    `;

    result.data.forEach((source) => {
        const option =
            document.createElement("option");

        option.value = source;
        option.textContent = source;

        sourceFilter.appendChild(option);
    });
}

async function loadArticles() {
    const params = new URLSearchParams();
    
    const source = sourceFilter.value;
    if (source) {
        params.set("source", source);
    }

    const from = fromDate.value;

    if (from) {
        params.set("from", from);
    }

    const to = toDate.value;

    if (to) {
        params.set("to", to);
    }

    const [sort, order] =
        sortFilter.value.split("-");

    params.set("sort", sort);
    params.set("order", order);
    const search =
        searchInput.value.trim();

    if (search) {
        params.set("q", search);
    }

    try {
        const response = await fetch(
            `${API_URL}/mentions?${params}`
        );

        if (!response.ok) {
            throw new Error(
                "Gagal mengambil article."
            );
        }

        const result =
            await response.json();

        renderArticles(result.data);

    } catch (error) {
        console.error(
            "Load articles error:",
            error
        );
    }
}