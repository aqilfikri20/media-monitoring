const uploadFile =document.getElementById("upload-file");
const fileInput =document.getElementById("file");
const uploadStatus =document.getElementById("upload-status");
const articleList =document.getElementById("article-list");
const searchInput =document.getElementById("search-input");
const searchButton =document.getElementById("search-button");
const sourceFilter =document.getElementById("source-filter");
const sortFilter =document.getElementById("sort-filter");
const fromDate =document.getElementById("from-date");
const toDate =document.getElementById("to-date");
const prevPage =document.getElementById("prev-page");
const nextPage =document.getElementById("next-page");
const pageNumbers =document.getElementById("page-numbers");

let currentPage = 1;
let totalPages = 1;
const API_URL = "http://localhost:3000";

prevPage.addEventListener(
    "click",
    () => {

        if (currentPage > 1) {

            currentPage--;

            loadArticles();
        }
    }
);

nextPage.addEventListener(
    "click",
    () => {

        if (
            currentPage < totalPages
        ) {

            currentPage++;

            loadArticles();
        }
    }
);

function resetPageAndLoad() {
    currentPage = 1;
    loadArticles();
}

fromDate.addEventListener(
    "change",
    resetPageAndLoad
);

toDate.addEventListener(
    "change",
    resetPageAndLoad
);

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

sourceFilter.addEventListener(
    "change",
    resetPageAndLoad
);
sortFilter.addEventListener(
    "change",
    resetPageAndLoad
);

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

    const sourceFilter =
        document.getElementById(
            "source-filter"
        );

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

uploadFile.addEventListener(
    "submit",
    async (event) => {

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

            const text =
                await file.text();

            const data =
                JSON.parse(text);

            if (!Array.isArray(data)) {
                throw new Error(
                    "Format JSON harus berupa array."
                );
            }

            const response =
                await fetch(
                    `${API_URL}/internal/mentions/bulk`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify(data),
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Upload gagal."
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
    }
);

async function loadArticles() {

    const params =
        new URLSearchParams();

    const search =
        searchInput.value.trim();

    if (search) {
        params.set("q", search);
    }

    const source =
        sourceFilter.value;
    if (source) {
        params.set("source", source);
    }

    const from =
        fromDate.value;
    if (from) {
        params.set(
            "from",
            from
        );
    }

   const to =
        toDate.value;

    if (to) {
        params.set(
            "to",
            to
        );
    }

    const [
        sort,
        order
    ] = sortFilter.value.split("-");

    params.set("sort", sort);
    params.set("order", order);
    params.set("page",currentPage.toString());
    try {
        const response =
            await fetch(
                `${API_URL}/mentions?${params}`
            );

        if (!response.ok) {
            throw new Error(
                "Gagal mengambil article."
            );
        }

        const result =
            await response.json();

        renderArticles(
            result.data
        );

        currentPage =
            result.pagination.page;

        totalPages =
            result.pagination.totalPages;

        renderPagination();

    } catch (error) {

        console.error(
            "Load articles error:",
            error
        );

    }
}

function renderPagination() {
    pageNumbers.innerHTML = "";

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement("button");

        button.textContent = page;

        button.className =
            "page-button";

        if (page === currentPage) {
            button.classList.add(
                "active"
            );
        }

        button.addEventListener(
            "click",
            () => {

                currentPage = page;

                loadArticles();

            }
        );

        pageNumbers.appendChild(
            button
        );
    }

    prevPage.disabled =
        currentPage <= 1;

    nextPage.disabled =
        currentPage >= totalPages;
}

function renderArticles(articles) {
    articleList.innerHTML = "";

    if (articles.length === 0) {

        articleList.innerHTML = `
            <p class="empty-article">
                Belum ada article.
            </p>
        `;

        return;
    }

    for (const article of articles) {

        const card =
            document.createElement("article");

        card.className = "article-card";

        const title =
            article.title ||
            "Untitled";

        const content =
            article.content ||
            "No content available.";

        const source =
            article.source ||
            "Unknown";

        const author =
            article.author ||
            "Anonymous";

        const engagement =
            article.engagement ?? 0;

        const date =
            article.published_at
                ? new Date(
                    article.published_at
                ).toLocaleDateString(
                    "id-ID"
                )
                : "-";

        card.innerHTML = `
            <div class="article-source">
                ${escapeHtml(source)}
            </div>

            <h4>
                ${escapeHtml(title)}
            </h4>

            <div class="article-content">
                ${escapeHtml(content)}
            </div>

            <div class="article-info">
                <span>
                    ${escapeHtml(author)}
                </span>

                <span>
                    ${date}
                </span>
            </div>

            <div class="article-info">
                <span>
                    Engagement: ${engagement}
                </span>

                ${
                    article.url
                        ? `
                        <a
                            class="article-link"
                            href="${escapeAttribute(article.url)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Read article →
                        </a>
                        `
                        : ""
                }
            </div>
        `;

        articleList.appendChild(card);
    }
}

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

const statsGroup =
    document.getElementById("stats-group");

const statsChart =
    document.getElementById("stats-chart");

let chart = null;

async function loadStats() {

    const groupBy =
        statsGroup.value;

    const response =
        await fetch(
            `${API_URL}/mentions/stats?group_by=${groupBy}`
        );

    if (!response.ok) {
        throw new Error(
            "Gagal mengambil statistics."
        );
    }

    const result =
        await response.json();

    renderStatsChart(
        result.data,
        groupBy
    );
}

function renderStatsChart(
    data,
    groupBy
) {

    if (chart) {
        chart.destroy();
    }

    let labels;
    let values;

    if (groupBy === "source") {

        labels =
            data.map(
                item => item.source
            );

        values =
            data.map(
                item => item.count
            );

    } else {

        labels = data.map(item => {
            const date = new Date(item.day);

            return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        });

        values =
            data.map(
                item => item.count
            );
    }
    const chartColors = [
        "#38BDF8",
        "#A78BFA",
        "#34D399",
        "#FBBF24",
        "#FB7185",
        "#60A5FA",
        "#F472B6",
        "#2DD4BF"
    ];
    chart =
        new Chart(
            statsChart,
            {
                type:
                    groupBy === "source"
                        ? "bar"
                        : "line",

                data: {
                    labels,
                    datasets: [
                        {
                            label:
                                groupBy === "source"
                                    ? "Mentions per Source"
                                    : "Mentions per Day",
                            backgroundColor: values.map(
                                (_, index) =>
                                    chartColors[
                                        index % chartColors.length
                                    ]
                            ),
                            borderColor: "#ffffffff",
                            pointBackgroundColor: values.map(
                                (_, index) =>
                                    chartColors[
                                        index % chartColors.length
                                    ]
                            ),
                            pointBorderColor:  values.map(
                                (_, index) =>
                                    chartColors[
                                        index % chartColors.length
                                    ]
                            ),
                            data: values,
                            
                            borderWidth: 2,
                            borderRadius:
                                groupBy === "source"
                                    ? 6
                                    : 0,

                            tension: 0.3,
                        
                        }
                    ]
                },

                options: {

                    responsive: true,
                    maintainAspectRatio:
                        false,

                    plugins: {
                        legend: {
                            display: false
                        }
                    },

                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                color: "#ffffffff",
                                precision: 0
                            },

                            grid: {
                                color: "#959595ff",
                                borderColor: "#959595ff",
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: "#ffffffff",
                                precision: 0
                            },

                            grid: {
                                color:"#959595ff",
                                borderColor: "#959595ff",
                            }
                        }

                    }
                }
            }
        );
}

statsGroup.addEventListener(
    "change",
    loadStats
);

loadSources();
loadArticles();
loadStats();