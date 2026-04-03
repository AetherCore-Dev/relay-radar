# VHS Demo: relay-radar tips
# Records the money-saving tips output

Output ./assets/demo-tips.gif

Set Shell bash
Set FontSize 16
Set Width 800
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 50ms
Set CursorBlink false

Type "# 💰 省钱技巧"
Enter
Sleep 1s

Type "node packages/cli/bin/relay-radar.mjs tips"
Enter
Sleep 4s

Type "# 📊 成本对比：Opus vs Sonnet vs Haiku"
Enter
Sleep 1s

Type "node packages/cli/bin/relay-radar.mjs cost claude-opus-4 200000 100000"
Enter
Sleep 3s

Type "node packages/cli/bin/relay-radar.mjs cost claude-sonnet-4 200000 100000"
Enter
Sleep 3s

Type "node packages/cli/bin/relay-radar.mjs cost claude-3.5-haiku 200000 100000"
Enter
Sleep 3s
