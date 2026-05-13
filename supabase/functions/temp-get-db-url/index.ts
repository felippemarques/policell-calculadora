// TEMPORARY edge function — DELETE after migration is done.
// Returns the Lovable Cloud Postgres connection string, protected by a token.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const provided = url.searchParams.get('token') ?? req.headers.get('x-access-token');
  const expected = Deno.env.get('MIGRATION_ACCESS_TOKEN');

  if (!expected || !provided || provided !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const dbUrl = Deno.env.get('SUPABASE_DB_URL') ?? null;
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? null;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? null;

  return new Response(
    JSON.stringify({
      SUPABASE_DB_URL: dbUrl,
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      warning: 'DELETE this function and rotate the service role key after migration.',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
