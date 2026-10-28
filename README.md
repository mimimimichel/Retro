# Retro Live

A live, interactive sprint retrospective board, one retro per sprint.

- Retro library: join the live retro, browse past sprints (stats, notes, actions, AI report), start a new one by sprint number
- Follow-up on the previous sprint's actions at check-in
- 18 formats, filtered by focus (short on time, feelings, team, ways of working, goals, risks, quality, customers, wins): Start·Stop·Continue, Mad·Sad·Glad, 4 Ls, Sailboat, Starfish, DAKI, Three Little Pigs, Plus/Delta, Rose·Thorn·Bud, KALM, Team health check, Kudos wall, Highs & Lows, Hot air balloon, Speed car, Pre-mortem, Tech debt radar, Customer value
- 7 steps: Weather → Write (hidden notes) → Reveal & group → Dot voting → Discuss → Actions → ROTI
- Shared timer, who's online, copyable Markdown summary
- Whiteboard boards: each format is a full illustrated scene (sky, sea, road, meadow, night…) with the drawing in the middle; sticky notes are stuck right on it, dragged anywhere (the zone follows where you drop), dropped onto each other to group, or added with a double-click on the drawing
- Hand-drawn illustrations for every format and step, drawn in with motion
- Focus mode while writing: slim header, compact step title, facilitator controls tucked into a small pill
- Signed "made by MichaelSoft"
- Intro animation, full-screen step transitions, staggered screen entrances, join notifications (all off with reduced motion)
- AI (facilitator, via the `sample` capability): suggested note groups with theme names, action ideas for the topic under discussion, and a shared retro report

`index.html` is published as a claude.ai Artifact (capabilities `db`, `room`, `user`, `sample`).

## Standalone version (Vercel + Supabase)

No claude.ai account needed: people open the link and type their name.

- `web/shim.js` provides the same `window.claude.use()` surface (db, user, room) backed by Supabase (one `docs` table + Realtime presence). AI features are hidden there.
- `python3 web/build.py` wraps `index.html` into `site/` (deployed to Vercel as a static site).
