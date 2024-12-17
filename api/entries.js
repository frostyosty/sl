import stringSimilarity from 'string-similarity';
import { createClient } from '@libsql/client';

const db = createClient({
    url: "libsql://canibartertransactions-frostyosty.turso.io",
    authToken: process.env.CANIBARTER_TRANSACTIONS_AUTH_TOKEN
});

// utility: fuzzy match helper
function getFuzzyMatch(input, key, candidates) {
    const bestMatch = stringSimilarity.findBestMatch(input.toLowerCase(), candidates.map(item => item[key]?.toLowerCase() || ''));
    return bestMatch.bestMatch.score >= 0.5 ? candidates[bestMatch.bestMatchIndex] : null;
}

// submit a new transaction
async function submitTransaction(req, res) {
    const { itemsGivenSubmission, itemsReceivedSubmission, tradeDateSubmission, locationSubmission } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!itemsGivenSubmission || !itemsReceivedSubmission || !tradeDateSubmission || !locationSubmission) {
        return res.status(400).json({ message: "All required fields must be filled." });
    }

    try {
        await db.execute(
            'INSERT INTO transactions (items_given, items_received, trade_date, location, ip_address) VALUES (?, ?, ?, ?, ?)',
            [
                JSON.stringify(itemsGivenSubmission),
                JSON.stringify(itemsReceivedSubmission),
                tradeDateSubmission,
                locationSubmission,
                ipAddress
            ]
        );
        res.status(200).json({ message: 'Transaction recorded successfully' });
    } catch (error) {
        console.error('[POST] Error submitting transaction:', error);
        res.status(500).json({ message: 'Error submitting transaction' });
    }
}

// get all transactions
async function getTransactions(req, res) {
    const { item, timeRange, location } = req.query;
    console.log('getTransactions called with:', req.query);

    try {
        let query = `
            SELECT items_given, items_received, trade_date, location, ip_address 
            FROM transactions 
            WHERE 1 = 1`;
        let params = [];

        // fuzz matching for item
        if (item?.trim()) {
            const allItems = (
                await db.execute(`
                    SELECT DISTINCT value 
                    FROM json_each((SELECT items_given FROM transactions UNION SELECT items_received FROM transactions))
                `)
            ).rows.map(row => row.value);

            const closestMatchItem = stringSimilarity.findBestMatch(item.toLowerCase(), allItems.map(value => value.toLowerCase())).bestMatch.target;
            if (!closestMatchItem) {
                console.error('No fuzzy match found for item:', item);
                return res.status(400).json({ message: `No match found for item: ${item}` });
            }

            query += `
                AND (
                    EXISTS (SELECT 1 FROM json_each(items_given) WHERE LOWER(value) = LOWER(?)) 
                    OR EXISTS (SELECT 1 FROM json_each(items_received) WHERE LOWER(value) = LOWER(?))
                )`;
            params.push(closestMatchItem, closestMatchItem);
        }

        // time filter
        if (timeRange && timeRange !== 'all') {
            const dateOffset = {
                week: '-7 days',
                month: '-1 month',
                year: '-1 year',
            }[timeRange] || '-7 days'; // default to '-7 days'

            query += ` AND trade_date >= DATE('now', ?)`;
            params.push(dateOffset);
        }

        // fuzz match for location
        if (location && location !== 'Global') {
            const allLocations = (await db.execute(`SELECT DISTINCT location FROM transactions`)).rows.map(row => row.location);
            const closestMatchLocation = stringSimilarity.findBestMatch(location.toLowerCase(), allLocations.map(loc => loc.toLowerCase())).bestMatch.target;

            if (!closestMatchLocation) {
                console.error('No fuzzy match found for location:', location);
                return res.status(400).json({ message: `No match found for location: ${location}` });
            }

            query += ` AND location = ?`;
            params.push(closestMatchLocation);
        }

        // sorting and limit
        query += ' ORDER BY trade_date DESC LIMIT 100';

        const result = await db.execute(query, params);

        const transactions = result.rows
            .map(row => {
                try {
                    return {
                        ...row,
                        items_given: JSON.parse(row.items_given),
                        items_received: JSON.parse(row.items_received),
                    };
                } catch (parseError) {
                    console.error('Error parsing JSON for row:', row, parseError);
                    return null; // skip invalid rows
                }
            })
            .filter(Boolean); // remove null rows

        res.status(200).json(transactions);
    } catch (error) {
        console.error('[GET] Error fetching transactions:', error);
        res.status(500).json({ message: 'Error fetching transactions' });
    }
}




// get transactions with filters
async function getTransactionsWithFilters(req, res) {
    const { item, timeRange, location } = req.query;
    console.log('getTransactionsWithFilters called with:', req.query);
    console.log("Query string received by backend to be processed:", new URLSearchParams(req.query).toString());

    try {
        let query = `
            SELECT items_given, items_received, trade_date, location, ip_address
            FROM transactions
            WHERE 1 = 1
        `;
        let params = [];

        // fuzzy matching for item
        if (item?.trim()) {
            let allItems = [];
            try {
                const itemsResult = await db.execute(`
                    SELECT DISTINCT value FROM json_each(
                        (SELECT items_given FROM transactions UNION SELECT items_received FROM transactions)
                    )
                `);
                allItems = itemsResult.rows.map(row => row.value).filter(Boolean); // ensure non-null values
            } catch (error) {
                console.error('Error fetching all items for fuzzy matching:', error);
            }

            const closestMatchItem = getFuzzyMatch(item, allItems);
            if (!closestMatchItem) {
                console.error('No fuzzy match found for item:', item);
                return res.status(400).json({ message: `No match found for item: ${item}` });
            }

            query += `
                AND (
                    EXISTS (SELECT 1 FROM json_each(items_given) WHERE LOWER(value) = LOWER(?))
                    OR EXISTS (SELECT 1 FROM json_each(items_received) WHERE LOWER(value) = LOWER(?))
                )
            `;
            params.push(closestMatchItem, closestMatchItem);
        }

        // handle timeRange
        if (timeRange && timeRange !== 'all') {
            if (timeRange === 'week') {
                const now = new Date();
                const dayOfWeek = now.getDay(); // Sunday = 0, Monday = 1, etc.
                const startOfWeek = new Date(now.setDate(now.getDate() - dayOfWeek));
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                query += ` AND trade_date BETWEEN ? AND ?`;
                params.push(startOfWeek.toISOString().slice(0, 10), endOfWeek.toISOString().slice(0, 10));
            } else {
                const dateOffset = { month: '-1 month', year: '-1 year' }[timeRange];
                query += ` AND trade_date >= DATE('now', ?)`;
                params.push(dateOffset);
            }
        }

        // fuzzy matching for location
        if (location && location !== 'Global') {
            let allLocations = [];
            try {
                const locationsResult = await db.execute(`SELECT DISTINCT location FROM transactions`);
                allLocations = locationsResult.rows.map(row => row.location).filter(Boolean);
            } catch (error) {
                console.error('Error fetching all locations for fuzzy matching:', error);
            }

            const closestMatchLocation = getFuzzyMatch(location, allLocations);
            if (!closestMatchLocation) {
                console.error('No fuzzy match found for location:', location);
                return res.status(400).json({ message: `No match found for location: ${location}` });
            }

            query += ` AND location = ?`;
            params.push(closestMatchLocation);
        }

        query += ' ORDER BY trade_date DESC LIMIT 100';
        console.log('Query:', query, 'Params:', params);

        const result = await db.execute(query, params);
        const transactions = result.rows.map(row => {
            try {
                return {
                    ...row,
                    items_given: JSON.parse(row.items_given),
                    items_received: JSON.parse(row.items_received),
                };
            } catch (parseError) {
                console.error('Error parsing JSON for row:', row, parseError);
                return null;
            }
        }).filter(Boolean);

        res.status(200).json(transactions);
    } catch (error) {
        console.error('[GET] Error fetching transactions:', error);
        res.status(500).json({ message: 'Error fetching transactions' });
    }
}

// get unique items
async function getUniqueItems(req, res) {
    try {
        const result = await db.execute(`
            SELECT DISTINCT items_given, items_received FROM transactions
        `);

        const uniqueItems = new Set();
        result.rows.forEach(row => {
            JSON.parse(row.items_given).forEach(item => uniqueItems.add(item));
            JSON.parse(row.items_received).forEach(item => uniqueItems.add(item));
        });

        res.status(200).json(Array.from(uniqueItems));
    } catch (error) {
        console.error('[GET] Error fetching unique items:', error);
        res.status(500).json({ message: 'Error fetching unique items' });
    }
}

// utility: fuzzy match helper
function getFuzzyMatch(input, possibleMatches) {
    if (!input || !possibleMatches.length) {
        console.warn(`No matches available for input: ${input}`);
        return null; // prevent errors
    }
    const scores = possibleMatches.map(item => ({
        value: item,
        score: stringSimilarity.compareTwoStrings(input.toLowerCase(), item.toLowerCase())
    }));
    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.value || input;
}

// Function to get unique items with fuzzy search
async function csfGetUniqueItemsFuzzy(req, res) {
    try {
        const { 'csf-search-query': searchQuery } = req.query; // renamed for prefix consistency
        
        if (!searchQuery) {
            return res.status(400).json({ message: 'Missing search query: csf-search-query is required' }); // consistent error format
        }

        const result = await db.execute(`
            SELECT DISTINCT items_given, items_received FROM csf-comment-section-transactions
        `);

        const uniqueItems = new Set();

        result.rows.forEach(row => {
            JSON.parse(row.items_given).forEach(item => {
                if (item.toLowerCase().includes(searchQuery.toLowerCase())) {
                    uniqueItems.add(item);
                }
            });

            JSON.parse(row.items_received).forEach(item => {
                if (item.toLowerCase().includes(searchQuery.toLowerCase())) {
                    uniqueItems.add(item);
                }
            });
        });

        res.status(200).json(Array.from(uniqueItems)); // return unique items as an array
    } catch (error) {
        console.error('[GET] Error fetching unique items with fuzzy search:', error);
        res.status(500).json({ message: 'Error fetching unique items' });
    }
}

// Main handler for API requests
export default async function csfHandler(req, res) {
    if (req.method === 'GET') {
        const { 'csf-type': type } = req.query; // renamed type for prefix consistency

        console.log('[GET] Request received with type:', type);

        if (type === 'csf-unique-items') {
            return csfGetUniqueItems(req, res);
        } else if (type === 'csf-unique-items-fuzzy') {
            return csfGetUniqueItemsFuzzy(req, res);
        } else if (type === 'csf-transactions-with-filters') {
            if (!req.query['csf-item'] && !req.query['csf-time-range'] && !req.query['csf-location']) {
                return res.status(400).json({ message: 'Missing required filters: csf-item, csf-time-range, or csf-location must be provided' });
            }
            return csfGetTransactionsWithFilters(req, res);
        } else if (type === 'csf-transactions') {
            return csfGetTransactions(req, res);
        } else {
            return res.status(400).json({ message: 'Invalid csf-type parameter for GET request' });
        }
    } else if (req.method === 'POST') {
        return csfSubmitTransaction(req, res);
    } else {
        return res.status(405).json({ message: 'Method Not Allowed: Only GET and POST are supported' });
    }
}

