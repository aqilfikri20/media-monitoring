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

    const firstLength =
        first.content?.length ?? 0;

    const secondLength =
        second.content?.length ?? 0;

    if (secondLength > firstLength) {
        return second;
    }

    return first;
}

function isDuplicate(
    first: NormalizedMention,
    second: NormalizedMention
): boolean {

    const sameUrl =
        first.url !== null &&
        second.url !== null &&
        first.url === second.url;

    const firstContent =
        getFirstSevenWords(first.content);

    const secondContent =
        getFirstSevenWords(second.content);

    const sameContent =
        firstContent !== null &&
        secondContent !== null &&
        firstContent === secondContent;

    return sameUrl || sameContent;
}

export function deduplicateMentions(
    mentions: NormalizedMention[]
): NormalizedMention[] {

    const result: NormalizedMention[] = [];

    for (const mention of mentions) {

        const existingIndex =
            result.findIndex(
                (existing) =>
                    isDuplicate(
                        existing,
                        mention
                    )
            );

        if (existingIndex === -1) {
            result.push(mention);
            continue;
        }

        const existing =
            result[existingIndex];

        if (existing === undefined) {
            result.push(mention);
            continue;
        }

        result[existingIndex] =
            keepLongestContent(
                existing,
                mention
            );
    }

    return result;
}