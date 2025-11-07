create a git commit following conventional commits with angular style, everything lowercase.

**NEVER commit automatically** - only commit when the user explicitly asks you to.

## MANDATORY PROCESS

1. **Check ALL changed files**: Run `git status --short` to see all modified, added, and deleted files
2. **Review actual changes**: Run `git diff --stat` to see file-level changes, then `git diff` for detailed changes
3. **Understand the full scope**: Read through the diffs to understand what was actually changed, not just what you remember
4. **Identify the primary purpose**: Determine the main goal/feature/fix that drove these changes
5. **Choose correct commit type**: `fix`, `feat`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`
6. **Use the correct format**: `<type>(<scope>): <subject>`
7. **Concise subject**: Keep subject line concise and descriptive (under 72 characters when possible), use present tense ("add" not "added", "fix" not "fixed").
8. **Create comprehensive message**: The commit message should reflect ALL significant changes, not just the most recent ones

## COMMON MISTAKES TO AVOID

- Creating commit message based only on the last change you made
- Using wrong commit type (e.g., `refactor` when it's actually a `feat`)
- Ignoring major changes because they're not in the most recent edits
- Grouping unrelated changes into one commit (should be multiple commits)
