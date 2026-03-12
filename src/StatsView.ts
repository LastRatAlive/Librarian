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
        return 'Reading stats';
    }

    getIcon(): string {
        return 'bar-chart';
    }

    onOpen(): Promise<void> {
        this.registerEvent(this.app.metadataCache.on('resolved', () => this.render()));
        this.render();
        return Promise.resolve();
    }

    render() {
        const container = this.containerEl.children[1];
        if (!container) return;
        container.empty();

        const header = container.createEl('div', { cls: 'nav-header' });
        header.createEl('div', { text: 'Reading stats', cls: 'nav-folder-title librarian-view-header' });

        const content = container.createEl('div', { cls: 'librarian-stats-view' });

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

                const readCountStr = frontmatter['readCount'] ? String(frontmatter['readCount']) : '0';
                const pagesStr = frontmatter['pages'] ? String(frontmatter['pages']) : '0';

                const readCount = parseInt(readCountStr) || 0;
                const pages = parseInt(pagesStr) || 0;

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
        this.renderStatCard(content, "Total books in library", allBooks.length.toString(), allBooks);
        this.renderStatCard(content, "Books read", readBooks.length.toString(), readBooks);
        this.renderStatCard(content, "Currently reading", currentlyReading.length.toString(), currentlyReading);

        // Custom Pages Render (Sorted by page count)
        const sortedPages = pagesData.sort((a, b) => b.pages - a.pages);
        this.renderStatCard(content, "Total pages read", totalPagesRead.toLocaleString(), sortedPages.map(p => p.file), (file) => {
            const data = sortedPages.find(sp => sp.file === file);
            return data ? `${data.pages} p.` : '';
        }, totalUniquePagesRead.toLocaleString());
    }

    private renderStatCard(container: HTMLElement, label: string, value: string, files: TFile[], subtextProvider?: (file: TFile) => string, subValue?: string) {
        const cardContainer = container.createEl('div', { cls: 'librarian-stat-card-container' });

        const card = cardContainer.createEl('div', { cls: 'librarian-stat-card' });

        card.createEl('div', { text: value, cls: 'librarian-stat-value' });

        if (subValue) {
            card.createEl('div', { text: `(${subValue} unique)`, cls: 'librarian-stat-subvalue' });
        }

        card.createEl('div', { text: label, cls: 'librarian-stat-label' });

        // Drill-down list (hidden by default)
        const listEl = cardContainer.createEl('div', { cls: 'librarian-stat-drilldown is-hidden' });

        // Search Bar
        const searchContainer = listEl.createDiv({ cls: 'librarian-search-container' });
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: `Search ${label.toLowerCase()}...`,
            cls: 'librarian-search-input'
        });

        const ul = listEl.createEl('ul');

        const showMoreBtn = listEl.createEl('button', { cls: 'librarian-show-more is-hidden' });

        let showAll = false;
        let currentFilter = "";

        const updateList = () => {
            ul.empty();
            const filtered = files.filter(f => f.basename.toLowerCase().includes(currentFilter.toLowerCase()));
            const count = filtered.length;

            const limit = 50;
            const toShow = (showAll || count <= limit) ? filtered : filtered.slice(0, limit);

            const fragment = document.createDocumentFragment();
            for (const file of toShow) {
                const li = fragment.createEl('li');

                const link = li.createEl('a', { text: file.basename, cls: 'internal-link' });

                link.onclick = (e) => {
                    void this.app.workspace.getLeaf(e.ctrlKey || e.metaKey).openFile(file);
                };

                if (subtextProvider) {
                    li.createEl('span', { text: subtextProvider(file), cls: 'subtext' });
                }
            }
            ul.appendChild(fragment);

            if (!showAll && count > limit) {
                showMoreBtn.removeClass('is-hidden');
                showMoreBtn.setText(`Show all (${count - limit} more)`);
                showMoreBtn.onclick = () => {
                    showAll = true;
                    updateList();
                };
            } else {
                showMoreBtn.addClass('is-hidden');
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
            const isHidden = listEl.hasClass('is-hidden');
            listEl.toggleClass('is-hidden', !isHidden);
            card.toggleClass('is-open', isHidden);
        };
    }
}
