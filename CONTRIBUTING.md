# Contributing to Student Savings (SEP) 🤝

Thank you for your interest in contributing to **Student Savings**! We are building open-source financial empowerment tools for students worldwide.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### 1. Reporting Bugs
- Search existing GitHub issues before submitting a new one.
- Use the **Bug Report** template.
- Provide clear steps to reproduce, device/browser details, and relevant console errors.

### 2. Suggesting Enhancements
- Have an idea to make campus budgeting even simpler? Open a **Feature Request** issue!
- Explain the real-world problem and why this enhancement benefits students.

### 3. Submitting Pull Requests
1. **Fork** the repository and clone your fork locally.
2. Create a new branch with a descriptive name:
   ```bash
   git checkout -b feature/cool-new-feature
   # or
   git checkout -b fix/issue-123
   ```
3. Make your changes adhering to project conventions:
   - Use Angular 18 standalone components and reactive signals.
   - Maintain the Odoo Plum (`#714B67`) & Teal (`#017e84`) design tokens.
   - Ensure all changes compile cleanly:
     ```bash
     npm run build
     cd backend && npm run build
     ```
4. Commit your changes following conventional commits:
   ```bash
   git commit -m "feat(purchases): add filtering by date"
   ```
5. Push to your fork and submit a **Pull Request** to `main`.

## Development Guidelines

- **Offline-First:** All client interactions must succeed in IndexedDB without waiting for network connectivity.
- **Privacy & Security:** Never hardcode personal API keys, passwords, or personal credentials into repository files.
- **Internationalization:** Keep UI strings clean and localized. Support multi-currency arithmetic without floating point drift.

Thank you for helping students achieve financial freedom! 🚀
