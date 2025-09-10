import sys
import subprocess
import tempfile
import re

def fix_codex_patch(patch_text: str) -> str:
    lines = patch_text.strip().splitlines()
    output = []
    skip_next = False

    for i, line in enumerate(lines):
        if skip_next:
            skip_next = False
            continue

        # Fix 'diff --git a//dev/null' lines
        if line.startswith("diff --git a//dev/null"):
            match = re.match(r"diff --git a//dev/null b/(.+)", line)
            if match:
                new_file = match.group(1)
                output.append(f"diff --git a/{new_file} b/{new_file}")
                output.append("new file mode 100644")
                output.append("index 0000000000000000000000000000000000000000..1111111111111111111111111111111111111111")
                output.append("--- /dev/null")
                output.append(f"+++ b/{new_file}")
                skip_next = True  # Skip the next line (likely broken)
            continue

        # Fix incorrect '--- a//dev/null'
        if line.strip() == "--- a//dev/null":
            output.append("--- /dev/null")
            continue

        output.append(line)

    return "\n".join(output) + "\n"

def main():
    print("🔧 Paste your Codex 3-way patch below. Press Ctrl+D when done:\n")
    raw_patch = sys.stdin.read()
    cleaned_patch = fix_codex_patch(raw_patch)

    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".diff") as tmp:
        tmp.write(cleaned_patch)
        patch_path = tmp.name

    print(f"\n🧼 Cleaned patch written to: {patch_path}")
    print("📦 Applying patch with: git apply --3way\n")

    result = subprocess.run(["git", "apply", "--3way", patch_path],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            text=True)

    if result.returncode == 0:
        print("✅ Patch applied successfully.")
    else:
        print("❌ Patch failed:")
        print(result.stderr)

if __name__ == "__main__":
    main()
