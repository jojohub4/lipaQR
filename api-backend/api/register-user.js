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

  const { username, email, phone, password } = req.body;

  try {
    // Check if username, email, or phone already exists in 'profiles'
    const checkRes = await fetch(
      `https://qchvjtyozxdwrlatpnav.supabase.co/rest/v1/profiles?or=(username.eq.${encodeURIComponent(username)},email.eq.${encodeURIComponent(email)},phone.eq.${encodeURIComponent(phone)})`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const existing = await checkRes.json();

    if (existing.length > 0) {
      const existingFields = [];
      existing.forEach((record) => {
        if (record.username === username) existingFields.push('username');
        if (record.email === email) existingFields.push('email');
        if (record.phone === phone) existingFields.push('phone number');
      });
      return res.status(409).json({
        error: `The following already exists: ${existingFields.join(', ')}`,
      });
    }

    // Step 1: Sign up the user
    const authResponse = await fetch('https://qchvjtyozxdwrlatpnav.supabase.co/auth/v1/signup', {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      return res.status(400).json({ error: 'Failed to create user', details: authData });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return res.status(500).json({ error: 'Signup successful, but user ID missing' });
    }

    // Step 2: Insert profile
    const profileRes = await fetch('https://qchvjtyozxdwrlatpnav.supabase.co/rest/v1/profiles', {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authData.session?.access_token || process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        id: userId,
        email,
        username,
        phone,
      }),
    });

    if (!profileRes.ok) {
      const errorText = await profileRes.text();
      return res.status(400).json({
        error: 'User created, but failed to save profile',
        details: errorText,
      });
    }

    const profileData = await profileRes.json();

    return res.status(200).json({
      message: 'User created and profile saved',
      userId,
      profile: profileData,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected error', details: error.toString() });
  }
}
