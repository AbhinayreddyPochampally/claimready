# ClaimReady MVP (Team StarGaze, Abhikalp 2026, Case 8)

Agentic claim-preparation prototype: an AI agent at the hospital insurance desk gathers the claim file,
checks it against the patient's policy, links every bill line to clinical evidence, fixes what it can,
asks the desk before any money changes, and submits. A simulated insurer re-verifies and auto-approves clean claims.

## Deploy (about 5 minutes, from Windows)

You need Node.js 20+ (check with `node -v`).

1. Open PowerShell in this folder:
   cd "C:\Users\Abhinay Reddy\Desktop\Abhikalp Case comp\ClaimReady\claimready-mvp"
2. Install packages:
   npm install
3. Log in to Vercel (once) and deploy:
   npx vercel login
   npx vercel --prod
   Answers: Set up and deploy? Y · Scope: your account · Link to existing project? N ·
   Project name: claimready · Directory: ./ · Modify settings? N
4. Add environment variables (Vercel dashboard → claimready → Settings → Environment Variables,
   tick Production, Preview and Development for each):
   - OPENAI_API_KEY = your OpenAI key (never share it)
   - OPENAI_MODEL = gpt-4.1-mini
   - SUPABASE_URL and SUPABASE_ANON_KEY = values in .env.example
5. Redeploy so the variables apply:
   npx vercel --prod
6. Open https://claimready.vercel.app (or the URL the CLI prints) → Desk queue → open a claim → Run ClaimReady agent.
   The trace badge should read "LLM agent · gpt-4.1-mini". If it says "Fallback planner", the OpenAI key is missing or has no credit.

## Run locally
   copy .env.example .env.local   (then add OPENAI_API_KEY)
   npm run dev   → http://localhost:3000

## Structure
- lib/data.js       six synthetic claims, hidden hospital-system records, prior-claim fingerprints
- lib/policy.js     fictional policy clauses, insurer package master, fast-lane limit
- lib/tools.js      the agent's tools: rules engine, evidence linker, code mapper, record search, duplicate check, desk approval
- lib/insurer.js    simulated insurer: re-runs all checks, applies fast-lane rule FL-1
- lib/agent.js      OpenAI function-calling loop with pause/resume for desk approval, plus a deterministic fallback planner
- app/api/run       streams each agent step to the browser (NDJSON)
- app/api/runs      insurer inbox history from Supabase
