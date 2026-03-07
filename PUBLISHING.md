# Publishing Librarian to Obsidian Community Plugins

This guide outlines the exhaustive steps, requirements, and policies for submitting the **Librarian** plugin to the official Obsidian community gallery.

## 1. Compliance & Developer Policies

Obsidian has strict policies regarding security, privacy, and branding. Your plugin **must** adhere to these to be accepted.

### 🛡️ Security & Privacy
- **No Code Obfuscation**: Your source code must be readable. Do not minify or obfuscate the code in the repository.
- **No Telemetry**: Client-side telemetry is strictly prohibited.
- **Network Disclosure**: You **must** disclose that the plugin connects to the **Open Library API** in your `README.md`. Explain what data is sent (search queries) and why.
- **Resource Management**: All event listeners, timers, and DOM elements must be cleaned up in the `onunload()` method using `this.registerEvent()` or similar.
- **No `innerHTML`**: Use Obsidian's DOM APIs (e.g., `createEl()`, `setText()`). Never use `innerHTML` or `insertAdjacentHTML` with user-defined input.

### 🏷️ Branding & Naming
- **Branding**: The plugin name cannot contain the word "Obsidian" (e.g., "Obsidian Librarian" is prohibited; "Librarian" is fine).
- **Description**: Your `manifest.json` description must be clear and concise (maximum 250 characters).

### 📱 Platform Parity
- **Mobile Support**: Ensure the plugin does not use Node.js or Electron-specific APIs (like `fs` or `crypto`) unless you explicitly set `"isDesktopOnly": true` in `manifest.json`. Librarian is currently designed to be cross-platform.

---

## 2. Pre-Submission Checklist

Ensure the following files are in the root of your repository:
- [x] `manifest.json`
- [x] `README.md` (Including network/API disclosures)
- [x] `LICENSE` (Must be a valid open-source license)
- [x] `styles.css`
- [ ] `main.js` (Generated via build)

---

## 3. Prepare the Release

Obsidian uses GitHub Releases to distribute your plugin.

1. **Verify Versioning**: Ensure the `version` in `package.json` and `manifest.json` match exactly (e.g., `1.0.0`).
2. **Build the Plugin**:
   ```bash
   npm run build
   ```
3. **Create a GitHub Release**:
   - The **Tag version** must match your `manifest.json` (e.g., `1.0.0`).
   - **Required Assets**: You must manually upload `main.js`, `manifest.json`, and `styles.css` as binary attachments to the release.

---

## 4. The Submission Process

1. **Fork the Releases Repository**: Fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases).
2. **Edit `community-plugins.json`**: Add your plugin metadata at the **end** of the array.
3. **Submit a Pull Request**:
   - Title: `Add plugin: Librarian`.
   - Fill out the PR template checklist completely.

---

## 5. Review & Beta Testing

- **The Wait**: Manual human review can currently take **3 to 5 months**.
- **The Bot**: An automated `ObsidianReviewBot` will scan your PR for common errors immediately. You must resolve all bot-flagged issues before a human reviewer will look at it.
- **Beta Testing (BRAT)**: While waiting for approval, it is highly recommended to encourage users to test your plugin via the **BRAT (Beta Reviewers Auto-update Tester)** plugin. This helps catch bugs and demonstrates a "battle-tested" tool to reviewers.

---

## Useful Links
- [Developer Policies](https://docs.obsidian.md/Developer+policies)
- [Plugin Submission Requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
