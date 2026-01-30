# Agent Guidelines

This document serves as the primary source of truth for AI agents and developers working on this project. It outlines behavioral expectations, technical standards, and workflow guidelines.

## Project Specific Guidelines (El Alquimista)

### Domain Logic & Mathematics

- **Single Source of Truth:** ALL alcohol-related calculations (density, dilution, correction) MUST use `lib/density.ts`.
- **Prohibited:** Do NOT implement ad-hoc math for ethanol density (e.g., do not use `0.789`). Density is non-linear and temperature-dependent.
- **Philosophy:** **Gravimetric (Weight) > Volumetric**. Always prefer mass-based calculations (`g`) over volume (`ml`) for precision.

### Tone & Copywriting

- **Locale:** Spanish (Rioplatense).
- **Style:** Technical, precise, formal but accessible.
- **Forbidden:** Slang (e.g., "Dale gas", "Che").
- **Standard Terms:**
  - Action: "Calcular" / "Actualizar"
  - Result: "Agua a agregar"
  - Error: "Revisar temperatura" / "Valor fuera de rango"

### UI/UX Patterns

- **Visuals:** Dark Mode (OLED) optimized, High Contrast.
- **Input:** Large tap targets (>48px). Use `type="number"`.
- **The "Nerd Card":** Every calculation result MUST include a collapsible `<details>` section labeled **"Ver cálculo detallado"**.
  - _Must show:_ Formula used, specific density ($\rho$), and contraction factors.

---

## Build, Lint, and Test

### Quick Commands

Use `make` targets for common tasks:

```bash
make update    # Update all dependencies
```

## Git Usage

### Commit Philosophy

The commit history should tell a clear and linear story of the project's evolution. We firmly prefer multiple small, atomic commits over large, monolithic ones.

- **Atomic Commits**: Context matters. If a feature implementation requires a prior refactor that touches many files, commit the refactor **first** and the feature **second**. Do not mix them.
- **Selective Staging**: Never use `git add .` blindly. Always add individual files or use `git add -p` (patch mode) to review and stage specific chunks of code. This prevents accidental inclusion of unrelated changes or temporary files.

### History & Merging

- **Linearity via Rebase**: We strictly prefer a linear history. When updating your branch with changes from the main line, always use `git rebase` (e.g., `git pull --rebase`). Avoid "merge bubbles" created by merging upstream changes into your feature branch.
- **The "Cover Letter" Merge**: Merges are permitted only when bringing a finished feature into the main branch. In this specific case, a merge commit allows you to write a "cover letter" summary for the group of atomic commits being introduced, preserving the context of the feature.
- **Amending**: Agents are encouraged to use `git commit --amend` to refine the logic or message of the latest commit to better tell the story. **Constraint**: Never amend commits on shared/protected branches (`main`, `master`) if they have already been pushed.

### Signing

- **No Signing**: Agents do not have access to private keys. Use the `--no-gpg-sign` flag explicitly in git commands to bypass signing requirements and avoid authentication errors.

### Verification

- **Working State**: Every commit must be self-contained and working. Ensure code compiles and passes tests _before_ committing. Do not commit broken code with the intention of fixing it in the next commit. This discipline is essential for tools like `git bisect` to work effectively.

### Commit Messages

Commit messages must communicate not just _what_ changed, but _why_.

- **Content**: Go beyond one-liners. Include the rationale for the change, any design decisions made, and context that might not be obvious from the code diff alone.
- **Formatting**: Text lines in the commit body should be wrapped to **80 columns** for readability in terminal interfaces.

### Security

> [!IMPORTANT]
> **NEVER COMMIT SECRETS**
>
> Strictly ensure that no credentials, API keys, .env files, or private certificates are ever added to the git history.

## Product Documentation

### Philosophy: Docs as Code

- **Source of Truth**: The repository is the single source of truth for both product requirements and implementation.
- **Definition First**: No feature code should be written without a corresponding product definition (PRD) or discovery document.

### Structure

- **Location**: All product documents reside in the `prds/` directory.
- **Format**: Standard Markdown files.
- **Content**: Documents should clearly articulate:
  - **Problem**: What are we solving and why?
  - **Solution**: The proposed approach.
  - **Scope**: What is in vs. out of bounds.
  - **Acceptance Criteria**: How do we verify success?

## Code Quality

### Core Principles

- **KISS**: Complexity is technical debt. Write code that is boring and easy to understand.
- **YAGNI**: Solve the problem at hand. Do not over-engineer for hypothetical futures.

### DRY (Don't Repeat Yourself)

> [!IMPORTANT]
> **Reuse over Duplication**
>
> Agents must be vigilant about spotting repetition. If logic or constants are used more than once, **extract them** into a shared function or constant immediately.
>
> - **Do not** write the same logic twice in different places.
> - **Do not** hardcode the same string/number in multiple places.
> - **Refactor** existing code to enable reuse rather than copying it.

## Dependency Management

### Philosophy: Less is More

We aim for a minimal footprint. Every external dependency introduces risk, maintenance overhead, and potential supply chain vulnerabilities.

- **Standard Library First**: Exhaust the capabilities of the language's standard library before reaching for a third-party package.
- **Justification Required**: Do not add a dependency for trivial utility functions (e.g., `left-pad`).

### Supply Chain Security

We are building towards a fully verifiable Software Bill of Materials (SBOM).

- **Vigilance**: Be extremely critical of new dependencies. Review their maintenance status, license, and transitive dependencies.
- **Lockfiles**: Always commit lockfiles to ensure reproducible builds.

## Testing

### Philosophy

- **Existence Proof**: If a feature is not tested, it does not exist.
- **Test-Driven Intent**: You must understand _how_ a feature will be tested before writing the implementation. We encourage writing the test case (or at least the interface) first.

### Standards

- **No Commented-Out Tests**: Tests are either passing or deleted (if obsolete). Never comment out a failing test to make the build pass.
- **Atomic Tests**: Tests should verify a single behavior and fail with a clear message indicating _what_ went wrong.

## Error Handling

### Philosophy: Fail Loudly

- **No Silent Failures**: Never swallow errors. If a function returns an error, it must be handled or propagated.
- **Context is King**: When propagating errors, always wrap them with context using `fmt.Errorf`.
  - **Bad**: `return err`
  - **Good**: `return fmt.Errorf("failed to parse config: %w", err)`

### Hygiene

- **Check Everything**: Never ignore errors with `_` unless you have a strong reason (document with a comment).
- **Error Wrapping**: Use `%w` verb for wrapping to preserve error chains for tools like `errors.Is()` and `errors.As()`.
