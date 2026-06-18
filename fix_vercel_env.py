import subprocess
import os

env_file = ".env.local"
environments = ["production", "preview", "development"]

if not os.path.exists(env_file):
    print(f"{env_file} not found.")
    exit(1)

envs_to_set = {}
with open(env_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip()
            # remove inline comments if any
            if " #" in val:
                val = val.split(" #")[0].strip()
            # remove surrounding quotes
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            elif val.startswith("'") and val.endswith("'"):
                val = val[1:-1]
            envs_to_set[key] = val

for key, val in envs_to_set.items():
    print(f"Processing {key}...")
    for env in environments:
        subprocess.run(f"npx.cmd vercel env rm {key} {env} --yes", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
    for env in environments:
        p = subprocess.Popen(["npx.cmd", "vercel", "env", "add", key, env], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        p.communicate(input=val.encode('utf-8'))
        
print("Done fixing environment variables!")
