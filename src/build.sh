#!/bin/bash
# usage: build.sh <outdir> [artifact]
set -e
cd $(dirname "$0")
OUT=$1; mkdir -p "$OUT"
VERSION=1.0.1
{
cat <<HTML
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>จินตคณิต · แบบฝึกหัด</title>
<meta name="theme-color" content="#E8DDFA">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
HTML
if [ "$2" != "artifact" ]; then echo '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png">'; fi
cat <<HTML
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600&family=Mali:wght@400;500;600;700&display=swap">
<style>
HTML
cat style.css
echo '</style></head><body><div id="app"></div>'
if [ "$2" = "artifact" ]; then echo '<script>window.__NO_SW=true</script>'; fi
echo "<script>const VERSION='$VERSION';"
cat engine.js app.js
echo '</script></body></html>'
} > "$OUT/index.html"
