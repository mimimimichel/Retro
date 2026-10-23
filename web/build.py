"""Build the standalone (Vercel) version of Retro Live from index.html.

Wraps the artifact page in a full HTML document and loads the Supabase
runtime (shim.js) before the app script. Output goes to site/.
Run: python3 web/build.py
"""
import pathlib, shutil

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "index.html").read_text(encoding="utf-8")
out = root / "site"
out.mkdir(exist_ok=True)

head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Live sprint retrospectives for the team.">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script src="/shim.js"></script>
</head>
<body>
"""
(out / "index.html").write_text(head + src + "\n</body>\n</html>\n", encoding="utf-8")
shutil.copy(root / "web" / "shim.js", out / "shim.js")
(out / "vercel.json").write_text('{"cleanUrls": true, "headers": [{"source": "/(.*)", "headers": [{"key": "Cache-Control", "value": "no-cache"}]}]}\n', encoding="utf-8")
print("built", out)
