"""Deep error analysis -- traces error through code, commits, and API routes.

Flow:
1. Error log comes in (e.g. "TypeError at /api/checkout, line 42 in checkout.ts")
2. Extract file path + line number from error
3. Fetch actual file content from GitHub at current HEAD
4. Fetch recent commit diffs to see what changed
5. Feed everything to Gemini: error + code + diff = root cause + fix
"""

import re
from app.core.encryption import decrypt_token
from app.core.supabase import supabase, safe_maybe_single
from app.integrations import gemini
from app.integrations.github_api import github_client


# Regex patterns to extract file paths from error logs
FILE_PATTERNS = [
    # Node.js/Next.js: at functionName (/path/to/file.ts:42:10)
    re.compile(r"at\s+\S+\s+\((.+?):(\d+):\d+\)"),
    # Node.js: /path/to/file.ts:42
    re.compile(r"(/(?:src|app|pages|lib|api|components|server|dist)/.+?\.\w+):(\d+)"),
    # Python: File "/path/to/file.py", line 42
    re.compile(r'File "(.+?)", line (\d+)'),
    # Generic: file.ts:42 or file.py:42
    re.compile(r"(\S+\.(?:ts|tsx|js|jsx|py|rs|go)):(\d+)"),
]

# API route patterns
API_ROUTE_PATTERNS = [
    re.compile(r"(?:GET|POST|PUT|PATCH|DELETE)\s+(/api/\S+)"),
    re.compile(r"path[=:]\s*[\"']?(/api/\S+?)[\s\"',}]"),
    re.compile(r"(/api/[\w/\-]+)\s+\d{3}"),  # /api/checkout 500
]

DEEP_ANALYSIS_SYSTEM = """You are a senior full-stack engineer doing production incident root cause analysis.

You have access to:
1. The actual error log from production
2. The source code of the file where the error occurred
3. Recent git commit diffs showing what was recently changed

Your job:
- Trace the exact execution path that caused the error
- Identify which specific line of code is the problem
- Explain WHY it fails (what condition/input triggers it)
- If a recent commit introduced the bug, point to the exact change
- Give a concrete fix (show the corrected code)

Rules:
- Quote exact line numbers and variable names from the code
- If a recent commit caused it, say "Introduced in commit {sha}: {description}"
- Don't guess -- if you can't determine root cause from the code, say so
- Write in the same language as the project description
- Never use emojis
- Be specific enough that the developer can fix it in 5 minutes

Return JSON:
{
  "error_trace": "The exact execution path: function A calls B, B accesses X.Y which is undefined because...",
  "root_cause": "Specific explanation of why this fails",
  "problematic_code": {"file": "path/to/file.ts", "line": 42, "code": "the problematic line"},
  "introduced_by": {"commit": "sha or null", "description": "what the commit changed"} or null,
  "fix": {
    "file": "path/to/file.ts",
    "line": 42,
    "before": "const discount = user.membership.discount;",
    "after": "const discount = user.membership?.discount ?? 0;"
  },
  "severity": "critical|warning|info",
  "user_impact": "What users experience (e.g. 'checkout page crashes for guest users')"
}
"""


def extract_file_paths(error_text: str) -> list[dict]:
    """Extract file paths and line numbers from error log."""
    results = []
    seen = set()
    for pattern in FILE_PATTERNS:
        for match in pattern.finditer(error_text):
            path = match.group(1)
            line = int(match.group(2)) if match.lastindex >= 2 else 0
            # Clean path -- remove absolute prefix, keep relative
            for prefix in ["/var/task/", "/app/", "/workspace/", "/home/runner/work/"]:
                if path.startswith(prefix):
                    path = path[len(prefix):]
                    break
            # Skip node_modules and .next
            if "node_modules" in path or ".next/" in path or "dist/" in path:
                continue
            key = f"{path}:{line}"
            if key not in seen:
                seen.add(key)
                results.append({"path": path, "line": line})
    return results[:5]  # Max 5 files


def extract_api_routes(error_text: str) -> list[str]:
    """Extract API route paths from error log."""
    routes = set()
    for pattern in API_ROUTE_PATTERNS:
        for match in pattern.finditer(error_text):
            routes.add(match.group(1))
    return list(routes)[:3]


async def deep_analyze_error(
    project_id: str,
    user_id: str,
    project_name: str,
    error_logs: list[dict],
) -> dict:
    """Deep analysis: error -> file content -> commit diff -> AI root cause.

    This is the core intelligence of LaunchPad.
    """
    # Get project GitHub info
    project = (
        supabase.table("projects")
        .select("github_repo_owner, github_repo_name, description")
        .eq("id", project_id)
        .single()
        .execute()
    )
    if not project.data or not project.data.get("github_repo_owner"):
        # Fallback to basic analysis (no GitHub connected)
        return await _basic_analysis(project_name, error_logs)

    # Get GitHub token
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token")
        .eq("user_id", user_id)
        .eq("provider", "github")
        .eq("is_active", True)
    )
    if not account:
        return await _basic_analysis(project_name, error_logs)

    token = decrypt_token(account["access_token"])
    owner = project.data["github_repo_owner"]
    repo = project.data["github_repo_name"]

    # Combine all error messages
    error_text = "\n".join(
        f"[{e.get('source', '?')}] {e.get('path', '')} {e.get('statusCode', '')} {e['message']}"
        for e in error_logs[:10]
    )

    # Step 1: Extract file paths from error
    files = extract_file_paths(error_text)
    api_routes = extract_api_routes(error_text)

    # Step 2: Fetch actual file content from GitHub
    file_contents = {}
    for f in files:
        try:
            content = await github_client.get_file_content(token, owner, repo, f["path"])
            # Get surrounding lines (context around error line)
            lines = content.split("\n")
            start = max(0, f["line"] - 10)
            end = min(len(lines), f["line"] + 10)
            numbered = "\n".join(f"{i+1}: {lines[i]}" for i in range(start, end))
            file_contents[f["path"]] = {
                "around_error": numbered,
                "error_line": f["line"],
                "total_lines": len(lines),
            }
        except Exception:
            continue

    # Step 3: If we found API routes, try to find their handler files
    for route in api_routes:
        # Convert /api/checkout -> try common patterns
        route_path = route.replace("/api/", "")
        candidates = [
            f"src/app/api/{route_path}/route.ts",
            f"src/pages/api/{route_path}.ts",
            f"app/api/routes/{route_path}.py",
        ]
        for candidate in candidates:
            if candidate not in file_contents:
                try:
                    content = await github_client.get_file_content(token, owner, repo, candidate)
                    file_contents[candidate] = {
                        "around_error": content[:2000],
                        "error_line": 0,
                        "total_lines": content.count("\n"),
                    }
                    break
                except Exception:
                    continue

    # Step 4: Get recent commit diffs
    recent_diffs = []
    try:
        diffs = await github_client.get_recent_commits_with_diffs(token, owner, repo, per_page=3)
        for d in diffs:
            relevant_files = [
                f for f in d.get("files", [])
                if any(fp["path"] in f.get("filename", "") for fp in files)
                or any(route.replace("/api/", "") in f.get("filename", "") for route in api_routes)
            ]
            if relevant_files:
                recent_diffs.append({
                    "sha": d["sha"][:7],
                    "message": d["message"][:100],
                    "date": d["date"],
                    "changes": [
                        {"file": f["filename"], "patch": f["patch"]}
                        for f in relevant_files
                    ],
                })
    except Exception:
        pass

    # Step 5: Build rich prompt with all context
    code_section = ""
    for path, info in file_contents.items():
        code_section += f"\n--- {path} (line {info['error_line']}) ---\n{info['around_error']}\n"

    diff_section = ""
    for d in recent_diffs:
        diff_section += f"\n--- Commit {d['sha']}: {d['message']} ---\n"
        for change in d["changes"]:
            diff_section += f"File: {change['file']}\n{change['patch']}\n"

    prompt = f"""
Product: {project_name}
Description: {project.data.get('description', 'N/A')}

== ERROR LOG ==
{error_text[:2000]}

== SOURCE CODE ==
{code_section[:3000] if code_section else "No source files found"}

== RECENT COMMITS (that modified related files) ==
{diff_section[:2000] if diff_section else "No relevant recent changes found"}

== API ROUTES IN ERROR ==
{', '.join(api_routes) if api_routes else 'None detected'}

Trace the error through the code. Identify the root cause.
If a recent commit caused it, point to the exact change.
"""

    try:
        analysis = await gemini.generate_json(
            prompt=prompt,
            system=DEEP_ANALYSIS_SYSTEM,
        )
        analysis["files_analyzed"] = list(file_contents.keys())
        analysis["commits_checked"] = [d["sha"] for d in recent_diffs]
        return analysis
    except Exception as e:
        return await _basic_analysis(project_name, error_logs)


async def _basic_analysis(project_name: str, error_logs: list[dict]) -> dict:
    """Fallback when GitHub is not connected."""
    error_text = "\n".join(e["message"] for e in error_logs[:5])
    prompt = f"""
Product: {project_name}
Errors: {error_text[:1500]}

Analyze these runtime errors. What's happening and how to fix it.
Return JSON: {{"error_trace": "...", "root_cause": "...", "fix": {{"description": "..."}}, "severity": "...", "user_impact": "..."}}
"""
    try:
        return await gemini.generate_json(
            prompt=prompt,
            system="You analyze production errors. Be specific and actionable. Never use emojis.",
        )
    except Exception:
        return {
            "error_trace": "Analysis failed",
            "root_cause": error_logs[0]["message"] if error_logs else "Unknown",
            "severity": "warning",
        }
