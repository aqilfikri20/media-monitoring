export interface MentionInput {
    external_id?: string | null;
    source?: string | null;
    title?: string | null;
    content?: string | null;
    url?: string | null;
    author?: string | null;
    published_at?: string | number | null;
    engagement?: string | number | null;
}

export interface NormalizedMention {
    external_id: string | null;
    source: string | null;
    title: string | null;
    content: string | null;
    url: string | null;
    author: string | null;
    published_at: Date | null;
    engagement: number | null;
}

function cleanText(value: string | null | undefined): string | null {
    if (value == null) {
        return null;
    }

    let text = value;

    text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<[^>]*>/g, "");

    text = text
        .replace(/&nbsp;/gi, " ")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");

    text = text.replace(/\s+/g, " ");
    text = text.trim();

    if (
        text === "" ||
        text === '""' ||
        text === "''"
    ) {
        return null;
    }

    return text;
}

function normalizeSource(
    value: string | null | undefined
): string | null {
    const source = cleanText(value);

    if (source === null) {
        return null;
    }

    const normalized = source.toLowerCase();

    const sourceMap: Record<string, string> = {
        "the star": "The Star",
        "thestar": "The Star",
        "twitter": "Twitter",
        "malaysiakini": "Malaysiakini",
        "malaysia kini": "Malaysiakini",
        "new straits times": "New Straits Times",
        "facebook": "Facebook",
        "instagram": "Instagram",
    };

    return sourceMap[normalized] ?? capitalizeFirstLetter(source);
}

function capitalizeFirstLetter(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function normalizeEngagement(
    value: string | number | null | undefined
): number | null {
    if (value == null) {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value)
            ? value
            : null;
    }

    const cleaned = value
        .replace(/,/g, "")
        .trim();

    if (cleaned === "") {
        return null;
    }

    const number = Number(cleaned);

    return Number.isFinite(number)
        ? number
        : null;
}

function normalizeDate(
    value: string | number | null | undefined
): Date | null {
    if (value == null) {
        return null;
    }

    // Unix timestamp
    if (typeof value === "number") {
        const date = new Date(value * 1000);

        return Number.isNaN(date.getTime())
            ? null
            : date;
    }

    const text = value.trim();

    if (text === "") {
        return null;
    }

    // Format DD/MM/YYYY
    const dateOnlyMatch = text.match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

    if (dateOnlyMatch) {
        const [, day, month, year] = dateOnlyMatch;

        const date = new Date(
            `${year}-${month}-${day}T00:00:00+08:00`
        );

        return Number.isNaN(date.getTime())
            ? null
            : date;
    }

    // Format:
    // 2026-08-10 08:20:00
    const mysqlLikeMatch = text.match(
        /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/
    );

    if (mysqlLikeMatch) {
        const [, datePart, timePart] = mysqlLikeMatch;

        const date = new Date(
            `${datePart}T${timePart}+08:00`
        );

        return Number.isNaN(date.getTime())
            ? null
            : date;
    }

    // ISO 8601:
    // 2026-08-10T08:15:00Z
    // 2026-08-11T14:02:33+08:00
    const date = new Date(text);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

export function normalizeMention(
    mention: MentionInput
): NormalizedMention {
    return {
        external_id: cleanText(mention.external_id),
        source: normalizeSource(mention.source),
        title: cleanText(mention.title),
        content: cleanText(mention.content),
        url: cleanText(mention.url),
        author: cleanText(mention.author),
        published_at: normalizeDate(mention.published_at),
        engagement: normalizeEngagement(mention.engagement),
    };
}