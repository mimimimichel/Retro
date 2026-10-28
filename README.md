# Retro Live

A live, interactive sprint retrospective board, one retro per sprint.

- Clear structure: a home page (new retro, happening now, past retros), a 3-step setup wizard (sprint, format, ready), a “Your turn” bar on every step telling each person what to do, a tidy facilitator bar with timer and more menus, and a “How it works” guide
- Retro library: join the live retro, browse past sprints (stats, notes, actions, AI report), start a new one by sprint number
- Follow-up on the previous sprint's actions at check-in
- 18 formats, filtered by focus (short on time, feelings, team, ways of working, goals, risks, quality, customers, wins): Start·Stop·Continue, Mad·Sad·Glad, 4 Ls, Sailboat, Starfish, DAKI, Three Little Pigs, Plus/Delta, Rose·Thorn·Bud, KALM, Team health check, Kudos wall, Highs & Lows, Hot air balloon, Speed car, Pre-mortem, Tech debt radar, Customer value
- 7 steps: Weather → Write (hidden notes) → Reveal & group → Dot voting → Discuss → Actions → ROTI
- Shared timer, who's online, copyable Markdown summary
- Illustrated boards where the zones are the drawing itself (houses, balloon, clouds, island, car, medals, traffic lights…): click anywhere on the drawing to stick a note right there, drag notes between zones, drop one onto another (or use ⧉) to group them; voting is a click on a note, and the discussion runs on the same drawing with ranks, votes and the current topic highlighted
- Hand-drawn illustrations for every format and step, drawn in with motion
- Full screen button in the header (where the browser allows it)
- Presentation mode for the facilitator: big projection view per step (read-only board, own notes stay hidden while writing), discreet controls and keyboard shortcuts (← → steps, T timer, N next topic, Esc exit)
- Focus mode while writing: slim header, compact step title, facilitator controls tucked into a small pill
- Signed "made by MichaelSoft"
- Intro animation, full-screen step transitions, staggered screen entrances, join notifications (all off with reduced motion)
- AI (facilitator, via the `sample` capability): suggested note groups with theme names, action ideas for the topic under discussion, and a shared retro report

`index.html` is published as a claude.ai Artifact (capabilities `db`, `room`, `user`, `sample`).

## Standalone version (Vercel + Supabase)

No claude.ai account needed: people open the link and type their name.

- `web/shim.js` provides the same `window.claude.use()` surface (db, user, room) backed by Supabase (one `docs` table + Realtime presence). AI features are hidden there.
- `python3 web/build.py` wraps `index.html` into `site/` (deployed to Vercel as a static site).
