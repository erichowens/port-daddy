import json
import glob
import os

chat_dir = "/Users/erichowens/.gemini/tmp/port-daddy/chats/"
files = glob.glob(chat_dir + "*.json")
files.sort(key=os.path.getmtime)

out_path = "docs/reports/user_prompts_history.md"
os.makedirs(os.path.dirname(out_path), exist_ok=True)

with open(out_path, "w") as out:
    for f in files:
        if os.path.getsize(f) == 0: continue
        with open(f, "r") as jf:
            try:
                data = json.load(jf)
                out.write(f"\n# File: {os.path.basename(f)}\n\n")
                for msg in data.get("messages", []):
                    if msg.get("role") == "user" or msg.get("type") == "user":
                        content = msg.get("content", "")
                        if isinstance(content, list):
                            text_parts = []
                            for p in content:
                                if isinstance(p, dict) and "text" in p:
                                    text_parts.append(p["text"])
                                elif isinstance(p, str):
                                    text_parts.append(p)
                            content = " ".join(text_parts)
                        elif isinstance(content, dict):
                            content = json.dumps(content)
                        
                        if content:
                            out.write(f"### {msg.get('timestamp', 'Unknown Time')}\n{content}\n\n---\n")
            except Exception as e:
                out.write(f"Error reading {f}: {e}\n")
