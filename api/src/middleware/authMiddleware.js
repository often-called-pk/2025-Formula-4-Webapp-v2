const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for server-side auth

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const authenticate = async (req, res, next) => {
  if (!supabase) {
    // If supabase is not configured, we can either deny all requests
    // or allow them in a "test" mode. For now, let's deny.
    return res.status(500).json({ error: 'Authentication service is not configured.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required: No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return res.status(401).json({ error: 'Authentication failed: Invalid token.', details: error.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Authentication failed: User not found.' });
    }

    req.user = user; // Attach user to the request object
    next();
  } catch (error) {
    res.status(500).json({ error: 'An unexpected authentication error occurred.', details: error.message });
  }
};

module.exports = { authenticate }; 