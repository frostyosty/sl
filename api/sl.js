import stringSimilarity from 'string-similarity';
import { createClient } from '@libsql/client';
// const fuzz = require('fuzzball');

const db = createClient({
    url: "libsql://sl-database-frostyosty.turso.io",
    authToken: process.env.CANIBARTER_SL_AUTH_TOKEN
});





// submit a new transaction

async function submitTransaction(req, res) {
    
    const { itemsGivenSubmission, itemsReceivedSubmission, tradeDateSubmission, locationSubmission } = req.body;

    // capture ip address from requested
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!itemsGivenSubmission || !itemsReceivedSubmission || !tradeDateSubmission || !locationSubmission) {
        return res.status(400).json({ message: "All required fields must be filled." });
    }

    try {
        const result = await db.execute(
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






// get all transactions initially
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
            console.log('Building query for item filter:', item);
            const allItems = (
                await db.execute(`
                    SELECT DISTINCT value 
                    FROM json_each((SELECT items_given FROM transactions UNION SELECT items_received FROM transactions))
                `)
            ).rows.map(row => row.value);
            const closestMatchItem = getFuzzyMatch(item, 'value', allItems);
            console.log('Fuzzy matched item:', closestMatchItem);
            if (!closestMatchItem) {
                console.error('No fuzzy match found for item:', item);
                return res.status(400).json({ message: `No match found for item: ${item}` });
            }
            query += `
                AND (
                    EXISTS (SELECT 1 FROM json_each(items_given) WHERE LOWER(value) = LOWER(?)) 
                    OR EXISTS (SELECT 1 FROM json_each(items_received) WHERE LOWER(value) = LOWER(?))
                )`;
            console.log('Generated SQL Query:', query);
            console.log('Query Parameters:', params);   
            params.push(closestMatchItem, closestMatchItem);
        }

        // time filter
        if (timeRange && timeRange !== 'all') {
            const dateOffset = {
                week: '-7 days',
                month: '-1 month',
                year: '-1 year',
            }[timeRange] || '-7 days'; // Default to '-7 days'

            console.log('Time range offset:', dateOffset);
            query += ` AND trade_date >= DATE('now', ?)`;
            params.push(dateOffset);
        }

        // fuzz match for location
        if (location && location !== 'Global') {
            const allLocations = (await db.execute(`SELECT DISTINCT location FROM transactions`)).rows.map(row => row.location);
            const closestMatchLocation = getFuzzyMatch(location, 'location', allLocations);
            if (!closestMatchLocation) {
                console.error('No fuzzy match found for location:', location);
                return res.status(400).json({ message: `No match found for location: ${location}` });
            }
            query += ` AND location = ?`;
            params.push(closestMatchLocation);
        }
        // sorting and limit
        query += ' ORDER BY trade_date DESC LIMIT 100';

        console.log('Query:', query);
        console.log('Params:', params);
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
                    return null; // skips invalid rows
                }
            })
            .filter(Boolean); // rm null rows

        res.status(200).json(transactions);
    } catch (error) {
        console.error('[GET] Error fetching transactions:', error);
        res.status(500).json({ message: 'Error fetching transactions' });
    }
}




// get all transactions with filters
async function getTransactionsWithFilters(req, res) {
    const { item, timeRange, location } = req.query;
    console.log('getTransactionsWithFilters called with:', req.query);
    console.log("Query String received by backend to be processed:", new URLSearchParams(req.query).toString());

    try {
        let query = `
            SELECT items_given, items_received, trade_date, location, ip_address
            FROM transactions
            WHERE 1 = 1
        `;
        let params = [];


        
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
            let allLocations = [];
            try {
                const locationsResult = await db.execute(`SELECT DISTINCT location FROM transactions`);
                allLocations = locationsResult.rows.map(row => row.location).filter(Boolean); // ensure non-null values
            } catch (error) {
                console.error('Error fetching all locations for fuzzy matching:', error);
            }            
            const closestMatchItem = getFuzzyMatch(item, 'value', allItems);
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
          if (timeRange && timeRange !== 'all') {
            if (timeRange === 'week') {
                // determine start and end of the current week (e.g., Sunday-Saturday)
                const now = new Date();
                const dayOfWeek = now.getDay(); // Sunday = 0, Monday = 1, etc.
                const startOfWeek = new Date(now.setDate(now.getDate() - dayOfWeek));
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                query += ` AND trade_date BETWEEN ? AND ?`;
                params.push(startOfWeek.toISOString().slice(0, 10), endOfWeek.toISOString().slice(0, 10));
            } else {
                // other ranges (month/year), continue using DATE('now', offset)
                const dateOffset = { month: '-1 month', year: '-1 year' }[timeRange];
                query += ` AND trade_date >= DATE('now', ?)`;
                params.push(dateOffset);
            }
        }

        if (location && location !== 'Global') {
            const allLocations = (await db.execute(`SELECT DISTINCT location FROM transactions`)).rows.map(row => row.location);
            const closestMatchLocation = getFuzzyMatch(location, 'location', allLocations);
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

async function getUniqueItemsFuzzy(req, res) {
    try {
        const { searchQuery } = req.query; // searchQuery from query params
        
        if (!searchQuery) {
            return res.status(400).json({ message: 'Search query is required' }); // error if no search query is provided
        }

        const result = await db.execute(`
            SELECT DISTINCT items_given, items_received FROM transactions
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

        res.status(200).json(Array.from(uniqueItems)); // unique items as array
    } catch (error) {
        console.error('[GET] Error fetching unique items:', error);
        res.status(500).json({ message: 'Error fetching unique items' });
    }
}



export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { type } = req.query;

        console.log('GET request received with type:', type);

        if (type === 'unique-items') {
            return getUniqueItems(req, res);
        } else if (type === 'unique-items-fuzzy') {
            return getUniqueItemsFuzzy(req, res);
        } else if (type === 'transactions-with-filters') {
            // query parameters are provided?
            if (!req.query.item && !req.query.timeRange && !req.query.location) {
                return res.status(400).json({ message: 'Missing required filters' });
            }
            return getTransactionsWithFilters(req, res);
        } else if (type === 'transactions') {
            return getTransactions(req, res);
        } else {
            res.status(400).json({ message: 'Invalid type parameter for GET request' });
        }
    } else if (req.method === 'POST') {
        return submitTransaction(req, res);
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
