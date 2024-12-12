export default async function handler(req, res) {
    const { ip } = req.query;
    const isBanned = bannedIps.includes(ip);
  
    res.status(200).json({ isBanned });
  }
  
