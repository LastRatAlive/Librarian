import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import LibrarianPlugin from './main';

export const STATS_VIEW_TYPE = 'librarian-stats-view';

export class StatsView extends ItemView {
    plugin: LibrarianPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: LibrarianPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return STATS_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Reading Stats';
    }

    getIcon(): string {
        return 'bar-chart';
    }

    async onOpen() {
        this.registerEvent(this.app.metadataCache.on('resolved', () => this.render()));
        this.render();
    }

    async render() {
        const container = this.containerEl.children[1];
        if (!container) return;
        container.empty();

        const header = container.createEl('div', { cls: 'nav-header' });
        header.createEl('h3', { text: 'Reading Stats', cls: 'nav-folder-title' });

        const content = container.createEl('div', { cls: 'nav-folder librarian-stats-view' });
        content.style.marginTop = '10px';
        content.style.padding = '0 15px';

        const allFiles = this.app.vault.getMarkdownFiles();
        let totalBooks = 0;
        let booksRead = 0;
        let currentlyReading = 0;
        let totalPagesRead = 0;

        for (const file of allFiles) {
            const cache = this.app.metadataCache.getFileCache(file);
            const frontmatter = cache?.frontmatter;

            if (frontmatter?.['type'] === 'book') {
                totalBooks++;

                const readCount = parseInt(frontmatter['readCount']) || 0;
                if (readCount > 0) {
                    booksRead++;
                    const pages = parseInt(frontmatter['pages']) || 0;
                    totalPagesRead += (pages * readCount);
                }

                if (frontmatter['currentlyReading'] === true || frontmatter['currentlyReading'] === 'true') {
                    currentlyReading++;
                }
            }
        }

        // Render Stats

        this.renderStatCard(content, "Total Books in Library", totalBooks.toString());
        this.renderStatCard(content, "Books Read", booksRead.toString());
        this.renderStatCard(content, "Currently Reading", currentlyReading.toString());
        this.renderStatCard(content, "Total Pages Read", totalPagesRead.toLocaleString());
    }

    private renderStatCard(container: HTMLElement, label: string, value: string) {
        const card = container.createEl('div');
        card.style.backgroundColor = 'var(--background-secondary)';
        card.style.padding = '15px';
        card.style.borderRadius = '8px';
        card.style.marginBottom = '10px';
        card.style.border = '1px solid var(--background-modifier-border)';

        const valueEl = card.createEl('div', { text: value });
        valueEl.style.fontSize = '2em';
        valueEl.style.fontWeight = 'bold';
        valueEl.style.color = 'var(--text-accent)';

        const labelEl = card.createEl('div', { text: label });
        labelEl.style.color = 'var(--text-muted)';
        labelEl.style.fontSize = '0.9em';
        labelEl.style.marginTop = '5px';
    }
}
