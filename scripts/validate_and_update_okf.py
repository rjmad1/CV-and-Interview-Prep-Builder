#!/usr/bin/env python3
import os
import sys
import re
import json
import yaml
import subprocess
from datetime import datetime, date
from pathlib import Path

# Paths
WORKSPACE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = WORKSPACE_DIR / "knowledge"
SCHEMA_PATH = KNOWLEDGE_DIR / "okf_metadata_schema.json"

def get_all_okf_files():
    okf_files = []
    # Check only valid OKF subfolders and skip metadata schema and README.md
    for folder in ["architecture", "business", "engineering", "operations", "product", "security"]:
        folder_path = KNOWLEDGE_DIR / folder
        if folder_path.exists() and folder_path.is_dir():
            for filepath in folder_path.glob("**/*.md"):
                okf_files.append(filepath)
    return okf_files

def stringify_dates(data):
    if isinstance(data, dict):
        return {k: stringify_dates(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [stringify_dates(v) for v in data]
    elif isinstance(data, (datetime, date)):
        return data.strftime("%Y-%m-%d")
    return data

def parse_frontmatter(content):
    if not content.startswith('---'):
        return None, content
    parts = content.split('---', 2)
    if len(parts) < 3:
        return None, content
    frontmatter_text = parts[1]
    body = parts[2]
    try:
        metadata = yaml.safe_load(frontmatter_text)
        metadata = stringify_dates(metadata)
        return metadata, frontmatter_text, body
    except Exception as e:
        raise ValueError(f"Invalid YAML syntax: {e}")

def validate_file(filepath, schema):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    try:
        metadata, _, _ = parse_frontmatter(content)
    except Exception as e:
        return False, f"Failed to parse frontmatter: {e}"
        
    if metadata is None:
        return False, "Missing YAML frontmatter (must start and end with '---')"
        
    try:
        from jsonschema import validate
        validate(instance=metadata, schema=schema)
    except Exception as e:
        return False, f"Schema validation error: {e}"
        
    return True, None

def get_git_changes():
    try:
        # Get unstaged and staged modified files
        res = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True, text=True, check=True
        )
        changed_files = []
        for line in res.stdout.strip().split('\n'):
            if line:
                # git status --porcelain shows status in first two columns, then file path
                filepath = line[3:].strip()
                changed_files.append(filepath)
        return changed_files
    except Exception as e:
        print(f"Warning: Failed to retrieve git changes: {e}", file=sys.stderr)
        return []

def get_affected_okf_files(changed_files, okf_files):
    affected = set()
    
    # Normalize paths to relative Unix-style
    changed_rel = []
    for f in changed_files:
        normalized = f.replace('\\', '/')
        changed_rel.append(normalized)
        
    for f in changed_rel:
        # If an OKF file is directly modified, it is affected and needs its date bumped
        if f.startswith("knowledge/") and f.endswith(".md"):
            full_path = WORKSPACE_DIR / f
            if full_path in okf_files:
                affected.add(full_path)
                continue

        # Map source changes to relevant OKF standards
        # 1. Backend/FastAPI Changes
        if f.startswith("apps/api/") or f.startswith("platform/ai-gateway/") or f.startswith("orchestration/"):
            for okf_f in okf_files:
                if okf_f.name in ["strategic_decision_register.md", "software_factory_blueprint.md"]:
                    affected.add(okf_f)
                    
        # 2. Frontend/Web Changes
        elif f.startswith("apps/web/"):
            for okf_f in okf_files:
                if okf_f.name in ["strategic_decision_register.md", "software_factory_blueprint.md"]:
                    affected.add(okf_f)
                    
        # 3. Security/Data Governance Changes
        elif f.startswith("security/") or f.startswith("data-governance/"):
            for okf_f in okf_files:
                if okf_f.name in ["risk_and_governance.md"]:
                    affected.add(okf_f)
                    
        # 4. Specifications/Contracts Changes
        elif f.startswith("specs/") or f.startswith("contracts/"):
            for okf_f in okf_files:
                if okf_f.name in ["strategic_decision_register.md", "software_factory_blueprint.md", "mvp_scope.md"]:
                    affected.add(okf_f)

        # 5. Generic build/infra changes
        elif f.startswith("infra/") or f.startswith("ci/") or f == "turbo.json" or f == "package.json":
            for okf_f in okf_files:
                if okf_f.name in ["software_factory_blueprint.md", "strategic_decision_register.md"]:
                    affected.add(okf_f)
                    
    return list(affected)

def update_last_updated(filepath, today_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    try:
        _, frontmatter_text, body = parse_frontmatter(content)
    except Exception as e:
        print(f"Error parsing {filepath} before update: {e}", file=sys.stderr)
        return False
        
    # Replace last_updated in frontmatter
    new_frontmatter, count = re.subn(
        r'^(last_updated\s*:\s*).*$',
        rf'\g<1>{today_str}',
        frontmatter_text,
        flags=re.M
    )
    
    if count == 0:
        new_frontmatter = frontmatter_text.rstrip() + f"\nlast_updated: {today_str}\n"
        
    updated_content = f"---{new_frontmatter}---{body}"
    
    if content == updated_content:
        return False
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    return True

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Validate and update OKF documentation.")
    parser.add_argument("--only-validate", action="store_true", help="Only validate files, do not auto-update dates.")
    parser.add_argument("--stage-changes", action="store_true", help="Stage automatically updated files in git.")
    parser.add_argument("--force", action="store_true", help="Force update of all OKF files, ignoring git changes.")
    args = parser.parse_args()
    
    # Load schema
    if not SCHEMA_PATH.exists():
        print(f"Error: OKF schema not found at {SCHEMA_PATH}", file=sys.stderr)
        sys.exit(1)
        
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema = json.load(f)
        
    okf_files = get_all_okf_files()
    if not okf_files:
        print("No OKF markdown files found.")
        sys.exit(0)
        
    # 1. Validation phase (always validate current state)
    validation_failed = False
    for filepath in okf_files:
        rel_path = filepath.relative_to(WORKSPACE_DIR)
        is_valid, err = validate_file(filepath, schema)
        if not is_valid:
            print(f"[-] Validation FAILED: {rel_path} - {err}", file=sys.stderr)
            validation_failed = True
        else:
            print(f"[+] Validation PASSED: {rel_path}")
            
    if validation_failed:
        print("\nError: One or more OKF files failed schema validation.", file=sys.stderr)
        sys.exit(1)
        
    if args.only_validate:
        sys.exit(0)
        
    # 2. Update phase
    if args.force:
        affected_okf = okf_files
        print("\nForcing update on all OKF files...")
    else:
        changed_files = get_git_changes()
        if not changed_files:
            print("No git changes detected. Skipping updates.")
            sys.exit(0)
            
        affected_okf = get_affected_okf_files(changed_files, okf_files)
        if not affected_okf:
            print("No affected OKF files based on current changes.")
            sys.exit(0)
        
    today_str = datetime.now().strftime("%Y-%m-%d")
    updated_files = []
    
    print("\nChecking for OKF updates...")
    for filepath in affected_okf:
        rel_path = filepath.relative_to(WORKSPACE_DIR)
        did_update = update_last_updated(filepath, today_str)
        if did_update:
            print(f"[+] Updated last_updated date: {rel_path}")
            updated_files.append(filepath)
            
    if args.stage_changes and updated_files:
        print("\nStaging updated OKF files...")
        for filepath in updated_files:
            try:
                subprocess.run(['git', 'add', str(filepath)], check=True)
                print(f"[+] Staged: {filepath.relative_to(WORKSPACE_DIR)}")
            except Exception as e:
                print(f"[-] Failed to stage {filepath.relative_to(WORKSPACE_DIR)}: {e}", file=sys.stderr)
                
    print("\nOKF process finished successfully.")

if __name__ == "__main__":
    main()
