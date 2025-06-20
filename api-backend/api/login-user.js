export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Step 1: Find user email from profiles using service role key
    const profileRes = await fetch(
      `https://qchvjtyozxdwrlatpnav.supabase.co/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=email`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const profileData = await profileRes.json();
    if (!profileRes.ok || profileData.length === 0) {
      return res.status(404).json({ error: 'Username not found' });
    }

    const email = profileData[0].email;

    // Step 2: Authenticate with Supabase email + password
    const signInRes = await fetch('https://qchvjtyozxdwrlatpnav.supabase.co/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const signInData = await signInRes.json();
    if (!signInRes.ok) {
      return res.status(401).json({ error: 'Invalid credentials', details: signInData });
    }

    return res.status(200).json({ message: 'Login successful', data: signInData });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected error', details: error.toString() });
  }
}
