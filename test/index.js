import { createClient } from '@libsql/client';

const client = createClient({
    url: 'libsql://b-frostyosty.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3MjkwMjk1NzksImlkIjoiMDg2ZmZiNWItOGZlNC00NDk5LTliMDYtOGJhNDEzYzUxNzU1In0.mg8_TIT7wOIe-mZKGC-ZgAnOYTHfxSBuGAKfeLpYmbFqWSuPXteRYTKmON7t5Q5OG7NFSK_k9aUZTZ-MeF5QBQ'
});

async function testConnection() {
    try {
        const result = await client.execute('SELECT 1');
        console.log('Database connection successful:', result);
    } catch (error) {
        console.error('Database connection failed:', error);
    }
}

testConnection();
