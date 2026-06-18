import os
import subprocess

def push_envs():
    with open(".env.local", "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
            
        if "=" in line:
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip()
            # Remove quotes if present
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            elif val.startswith("'") and val.endswith("'"):
                val = val[1:-1]
                
            print(f"Adding {key} to Vercel...")
            # We add to all environments: production, preview, development
            for env in ["production", "preview", "development"]:
                cmd = f'echo "{val}" | npx vercel env add {key} {env}'
                subprocess.run(cmd, shell=True)

if __name__ == "__main__":
    push_envs()
