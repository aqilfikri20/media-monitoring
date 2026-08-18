import type { NormalizedMention } from "./normalize";

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

function keepLongestContent(
    first: NormalizedMention,
    second: NormalizedMention
): NormalizedMention {
    if (first.content === null) {
        return second;
    }

    if (second.content === null) {
        return first;
    }

    if (second.content.length > first.content.length) {
        return second;
    }

    return first;
}

function deduplicateByUrl(
    mentions: NormalizedMention[]
): NormalizedMention[] {
    const result: NormalizedMention[] = [];

    for (const mention of mentions) {
        if (mention.url === null) {
            result.push(mention);
            continue;
        }

        const existingIndex = result.findIndex(
            (existing) =>
                existing.url !== null &&
                existing.url === mention.url
        );

        if (existingIndex === -1) {
            result.push(mention);
            continue;
        }

        const existing = result[existingIndex];

        if (existing === undefined) {
            result.push(mention);
            continue;
        }

        result[existingIndex] = keepLongestContent(
            existing,
            mention
        );
    }

    return result;
}

function deduplicateByContent(
    mentions: NormalizedMention[]
): NormalizedMention[] {
    const result: NormalizedMention[] = [];

    for (const mention of mentions) {
        const key = getFirstSevenWords(
            mention.content
        );

        if (key === null) {
            result.push(mention);
            continue;
        }

        const existingIndex = result.findIndex(
            (existing) =>
                getFirstSevenWords(existing.content) === key
        );

        if (existingIndex === -1) {
            result.push(mention);
            continue;
        }

        const existing = result[existingIndex];

        if (existing === undefined) {
            result.push(mention);
            continue;
        }

        result[existingIndex] = keepLongestContent(
            existing,
            mention
        );
    }

    return result;
}

export function deduplicateMentions(
    mentions: NormalizedMention[]
): NormalizedMention[] {
    const uniqueByUrl = deduplicateByUrl(
        mentions
    );

    const uniqueByContent = deduplicateByContent(
        uniqueByUrl
    );

    return uniqueByContent;
}