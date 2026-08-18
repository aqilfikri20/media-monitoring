import {Router} from "express";
import { pool } from "../connect_db";
import {normalizeMention, type NormalizedMention, type MentionInput} from "../preprocessing/normalize";
import { enrichMentions } from "../preprocessing/fill_null";
import { deduplicateMentions } from "../preprocessing/deduplicate";

const router = Router();

function createDedupeKey(
    mention: NormalizedMention
): string {
    if (mention.url !== null) {
        return `url:${mention.url}`;
    }

    if (mention.content !== null) {
        const contentKey = mention.content
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .slice(0, 7)
            .join(" ");

        return `content:${contentKey}`;
    }

    return `external_id:${mention.external_id}`;
}

function isDifferent(
    existing: NormalizedMention,
    incoming: NormalizedMention
): boolean {
    return (
        existing.external_id !== incoming.external_id ||
        existing.source !== incoming.source ||
        existing.title !== incoming.title ||
        existing.content !== incoming.content ||
        existing.url !== incoming.url ||
        existing.author !== incoming.author ||
        existing.published_at?.getTime() !==
            incoming.published_at?.getTime() ||
        existing.engagement !== incoming.engagement
    );
}

router.post("/internal/mentions/bulk",
    async (req, res) => {
        try{
            if (!Array.isArray(req.body)) {
                return res.status(400).json({
                    error: "Request body must be an array of mentions",
                });
            }
            const input =req.body as MentionInput[];
            
            const normalized = input.map(normalizeMention); 
            const enriched = enrichMentions(normalized);
            const unique = deduplicateMentions(enriched);

            let inserted = 0;
            let updated = 0;
            let unchanged = 0;
            for (const mention of unique){
                const dedupeKey = createDedupeKey(mention);
                const existingResult =
                    await pool.query(
                        `
                        SELECT
                            external_id,
                            source,
                            title,
                            content,
                            url,
                            author,
                            published_at,
                            engagement
                        FROM mentions
                        WHERE dedupe_key = $1
                        `,
                        [dedupeKey]
                    );

                if (existingResult.rowCount === 0) {
                    await pool.query(
                        `
                        INSERT INTO mentions (
                            external_id,
                            source,
                            title,
                            content,
                            url,
                            author,
                            published_at,
                            engagement,
                            dedupe_key
                        )
                        VALUES (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7,
                            $8,
                            $9
                        )
                        `,
                        [
                            mention.external_id,
                            mention.source,
                            mention.title,
                            mention.content,
                            mention.url,
                            mention.author,
                            mention.published_at,
                            mention.engagement,
                            dedupeKey,
                        ]
                    );

                    inserted++;
                    continue;
                }

                const existing =
                    existingResult.rows[0];

                if (!isDifferent(existing, mention)) {
                    unchanged++;
                    continue;
                }

                await pool.query(
                    `
                    UPDATE mentions
                    SET
                        external_id = $1,
                        source = $2,
                        title = $3,
                        content = $4,
                        url = $5,
                        author = $6,
                        published_at = $7,
                        engagement = $8
                    WHERE dedupe_key = $9
                    `,
                    [
                        mention.external_id,
                        mention.source,
                        mention.title,
                        mention.content,
                        mention.url,
                        mention.author,
                        mention.published_at,
                        mention.engagement,
                        dedupeKey,
                    ]
                );

                updated++;
            }

            return res.status(200).json({
                received: input.length,
                normalized: normalized.length,
                enriched: enriched.length,
                unique: unique.length,
                inserted,
                updated,
                unchanged,
            });
        } catch (error) {
            console.error(
                "Bulk ingest error:",
                error
            );

            return res.status(500).json({
                error: "Failed to ingest mentions",
            });
        }
    }
);

router.get(
    "/internal/mentions",
    async (_req, res) => {
        try {
            const result = await pool.query(
                `
                SELECT
                    id,
                    external_id,
                    source,
                    title,
                    content,
                    url,
                    author,
                    published_at,
                    engagement
                FROM mentions
                ORDER BY published_at DESC NULLS LAST
                `
            );

            return res.status(200).json(
                result.rows
            );

        } catch (error) {

            console.error(
                "Get mentions error:",
                error
            );

            return res.status(500).json({
                error: "Failed to get mentions",
            });
        }
    }
);

router.get(
    "/mentions",
    async (req, res) => {
        try {
            const q =
                typeof req.query.q === "string"
                    ? req.query.q.trim()
                    : "";

            const source =
                typeof req.query.source === "string"
                    ? req.query.source.trim()
                    : "";
            const from =
                typeof req.query.from === "string"
                    ? req.query.from.trim()
                    : "";

            const to =
                typeof req.query.to === "string"
                    ? req.query.to.trim()
                    : "";

            const sort =
                typeof req.query.sort === "string"
                    ? req.query.sort
                    : "published_at";

            const order =
                req.query.order === "asc"
                    ? "ASC"
                    : "DESC";

            const page =
                Math.max(
                    Number.parseInt(
                        String(req.query.page ?? "1"),
                        10
                    ),
                    1
                );

            const limit = 6;
            const offset =
                (page - 1) * limit;
                
            const values: string[] = [];
            const conditions: string[] = [];

            if (q) {

                values.push(`%${q}%`);

                conditions.push(`
                    (
                        title ILIKE $${values.length}
                        OR content ILIKE $${values.length}
                        OR source ILIKE $${values.length}
                        OR author ILIKE $${values.length}
                    )
                `);
            }

            if (source) {

                values.push(source);

                conditions.push(
                    `source = $${values.length}`
                );
            }

            if (from) {

                values.push(from);

                conditions.push(
                    `published_at >= $${values.length}::date`
                );
            }

            if (to) {
                values.push(to);
                conditions.push(
                    `published_at < ($${values.length}::date + INTERVAL '1 day')`
                );
            }
            const where =
                conditions.length > 0
                    ? `WHERE ${conditions.join(" AND ")}`
                    : "";

            const allowedSorts: Record<
                string,
                string
            > = {
                title: "title",
                source: "source",
                published_at: "published_at",
            };

            const sortColumn =
                allowedSorts[sort] ??
                "published_at";

            const stableOrder =
                `${sortColumn} ${order}, id ${order}`;

            const countResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::int AS total
                    FROM mentions

                    ${where}
                    `,
                    values
                );

            const total =
                countResult.rows[0].total;

            const totalPages =
                Math.ceil(
                    total / limit
                );

            const queryValues = [
                ...values,
                limit,
                offset,
            ];

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        external_id,
                        source,
                        title,
                        content,
                        url,
                        author,
                        published_at,
                        engagement
                    FROM mentions

                    ${where}

                    ORDER BY
                        ${stableOrder}
                    LIMIT $${values.length + 1}
                    OFFSET $${values.length + 2}
                    `,
                    queryValues
                );

            return res.status(200).json({
                data: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            });

        } catch (error) {

            console.error(
                "Get mentions error:",
                error
            );

            return res.status(500).json({
                error:
                    "Failed to get mentions",
            });
        }
    }
);

router.get(
    "/mentions/sources",
    async (_req, res) => {
        try {
            const result =
                await pool.query(
                    `
                    SELECT DISTINCT source
                    FROM mentions
                    WHERE source IS NOT NULL
                    ORDER BY source ASC
                    `
                );

            return res.status(200).json({
                data: result.rows.map(
                    (row) => row.source
                ),
            });

        } catch (error) {

            console.error(
                "Get sources error:",
                error
            );

            return res.status(500).json({
                error:
                    "Failed to get sources",
            });
        }
    }
);

router.get(
    "/mentions/stats",
    async (req, res) => {
        try {
            const groupBy =
                typeof req.query.group_by === "string"
                    ? req.query.group_by
                    : "source";

            if (
                groupBy !== "source" &&
                groupBy !== "day"
            ) {
                return res.status(400).json({
                    error:
                        "group_by harus berupa source atau day",
                });
            }

            let query: string;

            if (groupBy === "source") {

                query = `
                    SELECT
                        source,
                        COUNT(*)::int AS count
                    FROM mentions
                    GROUP BY source
                    ORDER BY count DESC
                `;

            } else {

                query = `
                    SELECT
                        DATE(published_at) AS day,
                        COUNT(*)::int AS count
                    FROM mentions
                    WHERE published_at IS NOT NULL
                    GROUP BY DATE(published_at)
                    ORDER BY day ASC
                `;

            }

            const result =
                await pool.query(query);

            return res.status(200).json({
                group_by: groupBy,
                data: result.rows,
            });

        } catch (error) {

            console.error(
                "Get stats error:",
                error
            );

            return res.status(500).json({
                error:
                    "Failed to get mention stats",
            });
        }
    }
);

export default router;
                        