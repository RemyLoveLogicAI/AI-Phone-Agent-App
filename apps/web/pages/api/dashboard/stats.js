import { getRecentCalls, getRecentMessages } from '../../../lib/twilio';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const [calls, messages] = await Promise.all([
      getRecentCalls(5),
      getRecentMessages(5)
    ]);

    // Merge with local AI data
    const { getAllCallData } = require('../../../lib/storage');
    const localData = getAllCallData();

    const enrichedCalls = calls.map(call => {
      const local = localData[call.id] || {};
      return { ...call, ...local };
    });

    res.status(200).json({ calls: enrichedCalls, messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
