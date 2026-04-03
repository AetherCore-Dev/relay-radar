# VHS Demo: relay-radar scan + tips + cost
# Records a clean terminal demo showing zero-key commands

Output ./assets/demo-scan.gif

Set Shell bash
Set FontSize 16
Set Width 800
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 50ms
Set CursorBlink false

Type "# 🛰️ RelayRadar — 零配置，不需要API Key"
Enter
Sleep 1s

Type "node packages/cli/bin/relay-radar.mjs tips"
Enter
Sleep 4s

Type "node packages/cli/bin/relay-radar.mjs cost claude-opus-4 100000 50000"
Enter
Sleep 3s

Type "node packages/cli/bin/relay-radar.mjs cost claude-sonnet-4 100000 50000"
Enter
Sleep 3s

Type "# ✅ 就这么简单！"
Enter
Sleep 2s
