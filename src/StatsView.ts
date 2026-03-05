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

        const allBooks: TFile[] = [];
        const readBooks: TFile[] = [];
        const currentlyReading: TFile[] = [];
        const pagesData: { file: TFile, pages: number, totalPages: number }[] = [];
        let totalPagesRead = 0;
        let totalUniquePagesRead = 0;

        for (const file of allFiles) {
            const cache = this.app.metadataCache.getFileCache(file);
            const frontmatter = cache?.frontmatter;

            if (frontmatter?.['type'] === 'book') {
                allBooks.push(file);

                const readCount = parseInt(frontmatter['readCount']) || 0;
                const pages = parseInt(frontmatter['pages']) || 0;

                if (readCount > 0) {
                    readBooks.push(file);
                    totalPagesRead += (pages * readCount);
                    totalUniquePagesRead += pages;
                    if (pages > 0) {
                        pagesData.push({ file, pages, totalPages: pages * readCount });
                    }
                }

                if (frontmatter['currentlyReading'] === true || frontmatter['currentlyReading'] === 'true') {
                    currentlyReading.push(file);
                }
            }
        }

        // Render Stats
        this.renderStatCard(content, "Total Books in Library", allBooks.length.toString(), allBooks);
        this.renderStatCard(content, "Books Read", readBooks.length.toString(), readBooks);
        this.renderStatCard(content, "Currently Reading", currentlyReading.length.toString(), currentlyReading);

        // Custom Pages Render (Sorted by page count)
        const sortedPages = pagesData.sort((a, b) => b.pages - a.pages);
        this.renderStatCard(content, "Total Pages Read", totalPagesRead.toLocaleString(), sortedPages.map(p => p.file), (file) => {
            const data = sortedPages.find(sp => sp.file === file);
            return data ? `${data.pages} p.` : '';
        }, totalUniquePagesRead.toLocaleString());
    }

    private renderStatCard(container: HTMLElement, label: string, value: string, files: TFile[], subtextProvider?: (file: TFile) => string, subValue?: string) {
        const cardContainer = container.createEl('div', { cls: 'librarian-stat-card-container' });
        cardContainer.style.marginBottom = '12px';

        const card = cardContainer.createEl('div', { cls: 'is-clickable' });
        card.style.backgroundColor = 'var(--background-secondary)';
        card.style.padding = '15px';
        card.style.borderRadius = '8px';
        card.style.border = '1px solid var(--background-modifier-border)';
        card.style.transition = 'background-color 0.2s ease';

        // Hover effect via JS since we can't easily add pseudo-classes here
        card.onmouseenter = () => card.style.backgroundColor = 'var(--background-secondary-alt)';
        card.onmouseleave = () => card.style.backgroundColor = 'var(--background-secondary)';

        const valueEl = card.createEl('div', { text: value });
        valueEl.style.fontSize = '2em';
        valueEl.style.fontWeight = 'bold';
        valueEl.style.color = 'var(--text-accent)';
        valueEl.style.lineHeight = '1.1';

        if (subValue) {
            const subValueEl = card.createEl('div', { text: `(${subValue} unique)` });
            subValueEl.style.fontSize = '0.8em';
            subValueEl.style.color = 'var(--text-muted)';
            subValueEl.style.marginTop = '2px';
        }

        const labelEl = card.createEl('div', { text: label });
        labelEl.style.color = 'var(--text-muted)';
        labelEl.style.fontSize = '0.9em';
        labelEl.style.marginTop = '4px';

        // Drill-down list (hidden by default)
        const listEl = cardContainer.createEl('div', { cls: 'librarian-stat-drilldown' });
        listEl.style.display = 'none';
        listEl.style.padding = '10px 12px';
        listEl.style.fontSize = '0.85em';
        listEl.style.maxHeight = '400px';
        listEl.style.overflowY = 'auto';
        listEl.style.border = '1px solid var(--background-modifier-border)';
        listEl.style.borderTop = 'none';
        listEl.style.borderBottomLeftRadius = '8px';
        listEl.style.borderBottomRightRadius = '8px';
        listEl.style.backgroundColor = 'var(--background-primary)';

        // Search Bar
        const searchContainer = listEl.createDiv({ cls: 'librarian-search-container' });
        searchContainer.style.marginBottom = '10px';
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: `Search ${label}...`,
            cls: 'librarian-search-input'
        });
        searchInput.style.width = '100%';
        searchInput.style.padding = '4px 8px';
        searchInput.style.borderRadius = '4px';
        searchInput.style.border = '1px solid var(--background-modifier-border)';

        const ul = listEl.createEl('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';

        const showMoreBtn = listEl.createEl('button', { cls: 'librarian-show-more' });
        showMoreBtn.style.width = '100%';
        showMoreBtn.style.marginTop = '8px';
        showMoreBtn.style.display = 'none';

        let showAll = false;
        let currentFilter = "";

        const updateList = () => {
            ul.empty();
            const filtered = files.filter(f => f.basename.toLowerCase().includes(currentFilter.toLowerCase()));
            const count = filtered.length;

            const limit = 50;
            const toShow = (showAll || count <= limit) ? filtered : filtered.slice(0, limit);

            for (const file of toShow) {
                const li = ul.createEl('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                li.style.marginBottom = '6px';
                li.style.paddingBottom = '4px';
                li.style.borderBottom = '1px solid var(--background-modifier-border-focus)';

                const link = li.createEl('a', { text: file.basename, cls: 'internal-link' });
                link.style.overflow = 'hidden';
                link.style.textOverflow = 'ellipsis';
                link.style.whiteSpace = 'nowrap';
                link.style.maxWidth = '70%';

                link.onclick = (e) => {
                    this.app.workspace.getLeaf(e.ctrlKey || e.metaKey).openFile(file);
                };

                if (subtextProvider) {
                    const subtext = li.createEl('span', { text: subtextProvider(file) });
                    subtext.style.color = 'var(--text-muted)';
                    subtext.style.fontSize = '0.9em';
                }
            }

            if (!showAll && count > limit) {
                showMoreBtn.style.display = 'block';
                showMoreBtn.setText(`Show all (${count - limit} more)`);
                showMoreBtn.onclick = () => {
                    showAll = true;
                    updateList();
                };
            } else {
                showMoreBtn.style.display = 'none';
            }

            if (count === 0) {
                ul.createEl('li', { text: 'No matches found', cls: 'librarian-no-matches' });
            }
        };

        searchInput.oninput = () => {
            currentFilter = searchInput.value;
            showAll = false;
            updateList();
        };

        updateList();

        // Toggle logic
        card.onclick = () => {
            const isHidden = listEl.style.display === 'none';
            listEl.style.display = isHidden ? 'block' : 'none';

            if (isHidden) {
                card.style.borderBottomLeftRadius = '0';
                card.style.borderBottomRightRadius = '0';
                card.style.borderBottom = 'none';
            } else {
                card.style.borderBottomLeftRadius = '8px';
                card.style.borderBottomRightRadius = '8px';
                card.style.borderBottom = '1px solid var(--background-modifier-border)';
            }
        };
    }
}
