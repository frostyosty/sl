import { createClient } from '@libsql/client';

const db = createClient({
  url: "libsql://canibartercommentsection-frostyosty.turso.io",
  authToken: process.env.CANIBARTER_COMMENT_SECTION_AUTH_TOKEN
});


const bannedIps = ["123.456.789.0", "987.654.321.0"];

export default async (req, res) => {
  const { method } = req;
  const { userIp } = req.body || req.query;

  console.log(`[${method}] Incoming request from IP: ${userIp}`);

  if (bannedIps.includes(userIp)) {
    console.log(`[${method}] Banned IP attempted to submit/comment: ${userIp}`);
    return res.status(403).json({ message: 'Your IP has been banned from commenting.' });
  }

  if (method === 'GET') {
    const { parentId } = req.query;
    const parentValue = parentId || null;
    
    try {
      const comments = await db.execute(
        'SELECT * FROM comments WHERE parent_id IS ? ORDER BY created_at DESC LIMIT 5', 
        [parentValue]
      );
      console.log(`[GET] Fetched comments:`, comments.rows);
      res.json(comments.rows);
    } catch (error) {
      console.error('[GET] Error fetching comments:', error);
      res.status(500).json({ message: 'Error fetching comments' });
    }
  } 
  
  else if (method === 'POST') {
    const { parentId, commentText, userIp } = req.body;
    const userHexColor = '#' + (parseInt(userIp.replace(/\D+/g, ''), 10) % 0xFFFFFF).toString(16);

    const lastComment = await db.execute(
      'SELECT created_at FROM comments WHERE user_ip = ? ORDER BY created_at DESC LIMIT 1',
      [userIp]
    );

    if (lastComment.rows.length && (new Date() - new Date(lastComment.rows[0].created_at)) < 10000) {
      console.log(`[POST] Rate limit hit for IP: ${userIp}`);
      return res.status(429).json({ message: 'You can only submit one comment every 10 seconds.' });
    }
    const parentValue = parentId || null;
    let depth = 0;
    if (parentId) {
      const depthData = await db.execute('SELECT depth FROM comments WHERE id = ?', [parentId]);
      depth = depthData.rows.length ? depthData.rows[0].depth + 1 : 0;
    }
    try {
      await db.execute(
        'INSERT INTO comments (parent_id, comment_text, created_at, user_ip, user_hex_color, depth) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)',
        [parentValue, commentText, userIp, userHexColor, depth]
      );
      console.log(`[POST] Comment added by IP: ${userIp}`);
      res.status(201).send({ message: 'Comment added' });
    } catch (error) {
      console.error('[POST] Error adding comment:', error);
      res.status(500).json({ message: 'Error adding comment' });
    }
  } 
  
  else if (method === 'PUT') {
    const { id, action } = req.body;
    const column = action === 'like' ? 'likes' : 'dislikes';

    try {
      await db.execute(`UPDATE comments SET ${column} = ${column} + 1 WHERE id = ?`, [id]);
      console.log(`[PUT] Vote counted for comment ID: ${id}, action: ${action}`);
      res.status(200).send({ message: 'Vote counted' });
    } catch (error) {
      console.error('[PUT] Error updating vote:', error);
      res.status(500).json({ message: 'Error updating vote' });
    }
  } 
  
  else {
    console.log(`[${method}] Method not allowed`);
    res.status(405).send({ message: 'Method Not Allowed' });
  }
};
