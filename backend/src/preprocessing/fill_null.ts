import { randomUUID } from "node:crypto";
import type { NormalizedMention } from "./normalize";

const fields = [
    "source",
    "title",
    "content",
    "url",
    "author",
    "published_at",
    "engagement",
] as const;

function fillFromRecord(
    target: NormalizedMention,
    source: NormalizedMention
): void {
    if (target.source === null) {
        target.source = source.source;
    }

    if (target.title === null) {
        target.title = source.title;
    }

    if (target.content === null) {
        target.content = source.content;
    }

    if (target.url === null) {
        target.url = source.url;
    }

    if (target.author === null) {
        target.author = source.author;
    }

    if (target.published_at === null) {
        target.published_at = source.published_at;
    }

    if (target.engagement === null) {
        target.engagement = source.engagement;
    }
}

function findByExternalId(
    mention: NormalizedMention,
    mentions: NormalizedMention[]
): NormalizedMention | undefined {
    if (mention.external_id === null) {
        return undefined;
    }

    return mentions.find(
        (other) =>
            other !== mention &&
            other.external_id !== null &&
            other.external_id === mention.external_id
    );
}

function findByUrl(
    mention: NormalizedMention,
    mentions: NormalizedMention[]
): NormalizedMention | undefined {
    if (mention.url === null) {
        return undefined;
    }

    return mentions.find(
        (other) =>
            other !== mention &&
            other.url !== null &&
            other.url === mention.url
    );
}

function getFirstSevenWords(
    content: string | null
): string | null {
    if (content === null) {
        return null;
    }

    return content
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .slice(0, 7)
        .join(" ");
}

function findByContent(
    mention: NormalizedMention,
    mentions: NormalizedMention[]
): NormalizedMention | undefined {
    const mentionKey = getFirstSevenWords(
        mention.content
    );

    if (mentionKey === null) {
        return undefined;
    }

    return mentions.find(
        (other) =>
            other !== mention &&
            getFirstSevenWords(other.content) === mentionKey
    );
}

function createExternalId(): string {
    return randomUUID();
}

function createTitleFromContent(
    content: string | null
): string | null {
    if (content === null) {
        return null;
    }

    const cleaned = content
        .trim()
        .replace(/\s+/g, " ");

    if (cleaned === "") {
        return null;
    }

    let endIndex = -1;

    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        // Tanda seru atau tanda tanya
        // langsung dianggap akhir kalimat
        if (char === "!" || char === "?") {
            endIndex = i + 1;
            break;
        }

        // Titik
        if (char === ".") {
            const nextChar = cleaned[i + 1];

            // Jika setelah titik ada angka,
            // berarti titik adalah bagian dari angka desimal.
            if (
                nextChar !== undefined &&
                /\d/.test(nextChar)
            ) {
                continue;
            }

            // Titik normal = akhir kalimat
            endIndex = i;
            break;
        }
    }

    let title: string;

    if (endIndex !== -1) {
        title = cleaned.slice(0, endIndex).trim();
    } else {
        title = cleaned;
    }

    // Hapus emoji
    title = title
        .replace(
            /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu,
            ""
        )
        .trim();

    return title || null;
}

function handleMissingContent(
    mention: NormalizedMention
): boolean {
    if (mention.content !== null) {
        return true;
    }

    if (mention.url !== null) {
        mention.content = `Visit to ${mention.url}`;
        return true;
    }

    // Content dan URL sama-sama kosong
    return false;
}

function createGoogleSearchUrl(
    title: string | null
): string | null {
    if (title === null || title.trim() === "") {
        return null;
    }

    return `https://www.google.com/search?q=${encodeURIComponent(
        title
    )}`;
}

function calculateAverageEngagement(
    mentions: NormalizedMention[]
): number {
    const values = mentions
        .map((mention) => mention.engagement)
        .filter(
            (value): value is number =>
                value !== null
        );

    if (values.length === 0) {
        return 0;
    }

    const total = values.reduce(
        (sum, value) => sum + value,
        0
    );

    return Math.round(total / values.length);
}

function fillDefaultValues(
    mention: NormalizedMention,
    averageEngagement: number
): void {
    // external_id
    if (mention.external_id === null) {
        mention.external_id = createExternalId();
    }

    // source
    if (mention.source === null) {
        mention.source = "Unknown";
    }

    // title
    if (mention.title === null) {
        mention.title = createTitleFromContent(
            mention.content
        );
    }

    // Jika content juga tidak tersedia
    if (mention.title === null) {
        mention.title = "Untitled";
    }

    // url
    if (mention.url === null) {
        mention.url = createGoogleSearchUrl(
            mention.title
        );
    }

    // author
    if (mention.author === null) {
        mention.author = "Anonymous";
    }

    // published_at
    if (mention.published_at === null) {
        mention.published_at = new Date();
    }

    // engagement
    if (mention.engagement === null) {
        mention.engagement = averageEngagement;
    }
}

export function enrichMentions(
    mentions: NormalizedMention[]
): NormalizedMention[] {

    const enriched = mentions.map(
        (mention) => ({
            ...mention,
        })
    );

    const averageEngagement =
        calculateAverageEngagement(enriched);

    const result: NormalizedMention[] = [];

    for (const mention of enriched) {

        const externalMatch =
            findByExternalId(
                mention,
                enriched
            );

        if (externalMatch) {
            fillFromRecord(
                mention,
                externalMatch
            );
        }

        const hasMissingValue =
            fields.some(
                (field) =>
                    mention[field] === null
            );

        if (hasMissingValue) {

            const urlMatch =
                findByUrl(
                    mention,
                    enriched
                );

            if (urlMatch) {
                fillFromRecord(
                    mention,
                    urlMatch
                );
            }
        }

        const stillMissingValue =
            fields.some(
                (field) =>
                    mention[field] === null
            );

        if (stillMissingValue) {

            const contentMatch =
                findByContent(
                    mention,
                    enriched
                );

            if (contentMatch) {
                fillFromRecord(
                    mention,
                    contentMatch
                );
            }
        }

        const keep =
            handleMissingContent(
                mention
            );

        if (!keep) {
            continue;
        }

        fillDefaultValues(
            mention,
            averageEngagement
        );

        result.push(mention);
    }

    return result;
}