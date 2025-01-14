import stringSimilarity from 'string-similarity';
import { createClient } from '@libsql/client';

const db = createClient({
    url: "libsql://sl-database-frostyosty.turso.io",
    authToken: process.env.SL_AUTH_TOKEN_FROM_SL
});


// submit a new entry
// Submit entry function
async function submitEntry(req, res) {
    const { nameSubmission, descriptionSubmission, approxDateSubmission, approxAgeSubmission, ethnicitySubmission, pictureSubmission } = req.body;

    // capture ip address from request
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!nameSubmission || !descriptionSubmission || !approxDateSubmission) {
        return res.status(400).json({ message: "Required fields (name, description, and approx date) must be filled." });
    }

    try {
        const result = await db.execute(
            `INSERT INTO entries 
            (name, description, created_at, picture, approx_date, approx_age, ethnicity, ip) 
            VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?)`,
            [
                nameSubmission,
                descriptionSubmission,
                pictureSubmission || null, // optional
                approxDateSubmission,
                approxAgeSubmission || null, // optional
                ethnicitySubmission || null, // optional
                ipAddress
            ]
        );
        res.status(200).json({ message: 'Entry recorded successfully' });
    } catch (error) {
        console.error('[POST] Error submitting entry:', error);
        res.status(500).json({ message: 'Error submitting entry' });
    }
}

// initial get entries
async function fetchEntries(req, res) {
    const { item, timeRange } = req.query;
    console.log('fetchEntries called with:', req.query);

    try {
        let query = `
            SELECT name, description, approx_date, approx_age, ethnicity, created_at, ip 
            FROM entries 
            WHERE 1 = 1`;
        let params = [];

        // Filter by item with fuzzy matching
        if (item?.trim()) {
            console.log('Building query for item filter:', item);
            const allItems = (
                await db.execute(`
                    SELECT DISTINCT name 
                    FROM entries 
                    UNION 
                    SELECT DISTINCT description 
                    FROM entries
                `)
            ).rows.map(row => row.name || row.description);

            const closestMatchItem = getFuzzyMatch(item, 'name or description', allItems);
            console.log('Fuzzy matched item:', closestMatchItem);
            if (!closestMatchItem) {
                console.error('No fuzzy match found for item:', item);
                return res.status(400).json({ message: `No match found for item: ${item}` });
            }

            query += `
                AND (
                    LOWER(name) = LOWER(?) 
                    OR LOWER(description) = LOWER(?)
                )`;
            params.push(closestMatchItem, closestMatchItem);
        }

        // Filter by time range
        if (timeRange && timeRange !== 'all') {
            const dateOffset = {
                week: '-7 days',
                month: '-1 month',
                year: '-1 year',
            }[timeRange] || '-7 days'; // Default to '-7 days'

            console.log('Time range offset:', dateOffset);
            query += ` AND created_at >= DATE('now', ?)`;
            params.push(dateOffset);
        }

        // Sorting and limiting results
        query += ' ORDER BY created_at DESC LIMIT 100';

        console.log('Query:', query);
        console.log('Params:', params);
        const result = await db.execute(query, params);

        // Transform and validate entries
        const entries = result.rows.map(row => {
            try {
                return {
                    name: row.name || '-',
                    description: row.description || '-',
                    approx_date: row.approx_date || '-',
                    approx_age: row.approx_age || '-',
                    ethnicity: row.ethnicity || '-',
                    created_at: new Date(row.created_at).toISOString(),
                    ip: row.ip || '-'
                };
            } catch (parseError) {
                console.error('Error parsing row:', row, parseError);
                return null; // Skip invalid rows
            }
        }).filter(Boolean);

        res.status(200).json(entries);
    } catch (error) {
        console.error('[GET] Error fetching entries:', error);
        res.status(500).json({ message: 'Error fetching entries' });
    }
}




// get all entries with filters
async function fetchEntriesWithFilters(req, res) {
    const { item, timeRange, ethnicity } = req.query;
    console.log('fetchEntriesWithFilters called with:', req.query);
    console.log("Query String received by backend to be processed:", new URLSearchParams(req.query).toString());

    try {
        let query = `
            SELECT id, name, description, created_at, picture, approx_date, approx_age, ethnicity, ip
            FROM entries
            WHERE 1 = 1
        `;
        let params = [];

        // Filter by item (name or description)
        if (item?.trim()) {
            const allItems = [];
            try {
                const itemsResult = await db.execute(`
                    SELECT DISTINCT name FROM entries
                    UNION
                    SELECT DISTINCT description FROM entries
                `);
                allItems.push(...itemsResult.rows.map(row => row.name || row.description).filter(Boolean));
            } catch (error) {
                console.error('Error fetching all items for fuzzy matching:', error);
            }

            const closestMatchItem = getFuzzyMatch(item, 'value', allItems);
            if (!closestMatchItem) {
                console.error('No fuzzy match found for item:', item);
                return res.status(400).json({ message: `No match found for item: ${item}` });
            }

            query += `
                AND (LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))
            `;
            params.push(`%${closestMatchItem}%`, `%${closestMatchItem}%`);
        }

        // Filter by time range
        if (timeRange && timeRange !== 'all') {
            if (timeRange === 'week') {
                const now = new Date();
                const dayOfWeek = now.getDay();
                const startOfWeek = new Date(now.setDate(now.getDate() - dayOfWeek));
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                query += ` AND created_at BETWEEN ? AND ?`;
                params.push(startOfWeek.toISOString().slice(0, 10), endOfWeek.toISOString().slice(0, 10));
            } else {
                const dateOffset = { month: '-1 month', year: '-1 year' }[timeRange];
                query += ` AND created_at >= DATE('now', ?)`;
                params.push(dateOffset);
            }
        }

        // Filter by ethnicity
        if (ethnicity?.trim()) {
            const allEthnicities = (await db.execute(`SELECT DISTINCT ethnicity FROM entries`)).rows.map(row => row.ethnicity).filter(Boolean);
            const closestMatchEthnicity = getFuzzyMatch(ethnicity, 'ethnicity', allEthnicities);
            if (!closestMatchEthnicity) {
                console.error('No fuzzy match found for ethnicity:', ethnicity);
                return res.status(400).json({ message: `No match found for ethnicity: ${ethnicity}` });
            }
            query += ` AND ethnicity = ?`;
            params.push(closestMatchEthnicity);
        }

        query += ' ORDER BY created_at DESC LIMIT 100';
        console.log('Query:', query, 'Params:', params);

        const result = await db.execute(query, params);
        const entries = result.rows.map(row => {
            try {
                return {
                    ...row,
                    picture: row.picture || 'No picture provided',
                };
            } catch (error) {
                console.error('Error processing row:', row, error);
                return null;
            }
        }).filter(Boolean);

        res.status(200).json(entries);
    } catch (error) {
        console.error('[GET] Error fetching entries:', error);
        res.status(500).json({ message: 'Error fetching entries' });
    }
}



// utility

function getFuzzyMatch(input, field, possibleMatches) {
    if (!input || !possibleMatches.length) {
        console.warn(`No matches available for input: ${input}, field: ${field}`);
        return null; // prevent errors
    }
    const scores = possibleMatches.map(item => ({
        value: item,
        score: stringSimilarity.compareTwoStrings(input.toLowerCase(), item.toLowerCase())
    }));
    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.value || input;
}


// getunique items
async function getUniqueItems(req, res) {
    try {
        const result = await db.execute(`
            SELECT DISTINCT name, description, ethnicity FROM entries
        `);

        const uniqueItems = new Set();
        result.rows.forEach(row => {
            uniqueItems.add(row.name);
            uniqueItems.add(row.description);
            uniqueItems.add(row.ethnicity);
        });

        res.status(200).json(Array.from(uniqueItems));
    } catch (error) {
        console.error('[GET] Error fetching unique items:', error);
        res.status(500).json({ message: 'Error fetching unique items' });
    }
}

async function getUniqueItemsFuzzy(req, res) {
    try {
        const { searchQuery } = req.query;

        if (!searchQuery) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const result = await db.execute(`
            SELECT DISTINCT name, description, ethnicity FROM entries
        `);

        const uniqueItems = new Set();
        result.rows.forEach(row => {
            [row.name, row.description, row.ethnicity].forEach(item => {
                if (item?.toLowerCase().includes(searchQuery.toLowerCase())) {
                    uniqueItems.add(item);
                }
            });
        });

        res.status(200).json(Array.from(uniqueItems));
    } catch (error) {
        console.error('[GET] Error fetching unique items:', error);
        res.status(500).json({ message: 'Error fetching unique items' });
    }
}



export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { type } = req.query;

        if (type === 'unique-items') {
            return getUniqueItems(req, res);
        } else if (type === 'fetchEntries') {
            return fetchEntries(req, res);
        } else if (type === 'unique-items-fuzzy') {
            return getUniqueItemsFuzzy(req, res);
        } else if (type === 'entries-with-filters') {
            if (!req.query.item && !req.query.timeRange) {
                return res.status(400).json({ message: 'Missing required filters' });
            }
            return fetchEntriesWithFilters(req, res);
        } else {
            res.status(400).json({ message: 'Invalid type parameter for GET request' });
        }
    } else if (req.method === 'POST') {
        return submitEntry(req, res);
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}

