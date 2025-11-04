create a git commit following conventional commits with angular style, everything lowercase.

**NEVER commit automatically** - only commit when the user explicitly asks you to.

**Conventional commits with Angular style** - use lowercase throughout commit messages.

Format: `<type>(<scope>): <subject>`

Types: `fix`, `feat`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`

Keep subject line concise and descriptive (under 72 characters when possible).
Use present tense ("add" not "added", "fix" not "fixed").

## CRITICAL: Always Review ALL Changes Before Committing

**MANDATORY PROCESS:**

1. **Check ALL changed files**: Run `git status --short` to see all modified, added, and deleted files
2. **Review actual changes**: Run `git diff --stat` to see file-level changes, then `git diff` for detailed changes
3. **Understand the full scope**: Read through the diffs to understand what was actually changed, not just what you remember
4. **Identify the primary purpose**: Determine the main goal/feature/fix that drove these changes
5. **Choose correct commit type**:
   - `feat`: New feature or major functionality (e.g., "add workos auth", "add provider credential management")
   - `fix`: Bug fix or error correction
   - `refactor`: Code restructuring without changing behavior
   - `docs`: Documentation changes only
   - `chore`: Build/tooling changes, dependency updates
6. **Create comprehensive message**: The commit message should reflect ALL significant changes, not just the most recent ones

**Common Mistakes to Avoid:**

- ❌ Creating commit message based only on the last change you made
- ❌ Using wrong commit type (e.g., `refactor` when it's actually a `feat`)
- ❌ Ignoring major changes because they're not in the most recent edits
- ❌ Grouping unrelated changes into one commit (should be multiple commits)
