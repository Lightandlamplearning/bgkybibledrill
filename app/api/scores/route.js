// app/api/scores/route.js
// Public leaderboard — server-side Supabase access (key never exposed to browser)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function supabaseRequest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// GET /api/scores — fetch top 50 public scores
export async function GET() {
  try {
    const data = await supabaseRequest(
      "/public_scores?select=player_name,score,game_mode,question_count,correct_count,created_at&order=score.desc&limit=50"
    );
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/scores — submit a score
export async function POST(request) {
  try {
    const body = await request.json();
    const { player_name, score, game_mode, question_count, correct_count } = body;

    if (!player_name || typeof player_name !== "string") {
      return Response.json({ error: "Invalid player name" }, { status: 400 });
    }
    if (typeof score !== "number" || score <= 10) {
      return Response.json({ error: "Score too low" }, { status: 400 });
    }

    const clean_name = player_name.trim().slice(0, 20);

    await supabaseRequest("/public_scores", {
      method: "POST",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify({
        player_name: clean_name,
        score,
        game_mode: game_mode || "unknown",
        question_count: question_count || 0,
        correct_count: correct_count || 0,
      }),
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
