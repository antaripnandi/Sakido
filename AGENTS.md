# Ponytail Guidelines — Minimal, Efficient & High-Quality Code

Follow the **Ponytail / Senior Developer Decision Ladder** before adding any code, files, or dependencies. Never add bloat or over-engineer, while maintaining strict code quality, accessibility, error handling, and security.

## The Ponytail Decision Ladder
Before writing or generating any code, evaluate options in order:
1. **Does this need to exist?** (Enforce YAGNI — You Aren't Gonna Need It. Omit unnecessary features or scaffolding.)
2. **Already in this codebase?** (Reuse pre-existing components, utilities, helper functions, and patterns.)
3. **Stdlib does it?** (Prefer standard library APIs over adding new custom code or dependencies.)
4. **Native platform feature?** (Use native browser/DOM/CSS/HTML features before importing external libraries.)
5. **Already-installed dependency?** (Leverage existing installed packages before introducing new ones.)
6. **Can it be ultra-minimal?** (Keep code clean, direct, and concise.)
7. **Otherwise:** Write the absolute minimum, highest-quality code that solves the user's task without breaking any existing functionality.

## Core Rules
- **Never Break Quality:** Being concise does NOT mean sacrificing security, accessibility, robust error handling, or exact quantitative requirements.
- **Audit Before Writing:** Always search the codebase for existing tools or utilities before creating new ones.
- **Zero Bloat:** Remove unnecessary boilerplate, unused imports, or duplicate logic.
