#!/usr/bin/env bash
set -euo pipefail

marker='<!-- sprintjam-preview -->'
preview_url=$(jq -ers --arg name "pr-${PR_NUMBER}" '
  [.[] | select(.type == "preview" and .preview_name == $name)]
  | last | .preview_urls[0] // empty
  | select(type == "string" and test("^https://[a-zA-Z0-9.-]+/?$"))
' "$WRANGLER_OUTPUT_FILE_PATH")

comment_id=$(gh api --paginate --slurp \
  "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments?per_page=100" |
  jq -r --arg marker "$marker" '
    [.[][] | select(.user.login == "github-actions[bot]"
      and ((.body // "") | startswith($marker)))]
    | first | .id // empty
  ')

body_file=$(mktemp)
trap 'rm -f "$body_file"' EXIT
printf '%s\n\nPreview deployed: <%s>\n\nCommit: `%s`\n' \
  "$marker" "$preview_url" "$PR_HEAD_SHA" > "$body_file"

if [[ -n "$comment_id" ]]; then
  gh api --method PATCH \
    "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" \
    -F "body=@${body_file}" --silent
else
  gh api --method POST \
    "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
    -F "body=@${body_file}" --silent
fi
