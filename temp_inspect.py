from pathlib import Path
text = Path('frontend/src/pages/Settings.tsx').read_text(encoding='utf-8')
start = text.index('Form.Item label')
segment = text[start:start+120]
print(segment)
print([hex(ord(ch)) for ch in segment[:30]])
