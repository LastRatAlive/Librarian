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
        const booksByYear: Record<string, TFile[]> = {};
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

                    let yearsRead: string[] = [];
                    if (frontmatter['readHistory'] && Array.isArray(frontmatter['readHistory'])) {
                        for (const session of frontmatter['readHistory']) {
                            if (session.end && session.end !== "DNF") {
                                const year = session.end.split('-')[0];
                                if (year) yearsRead.push(year);
                            }
                        }
                    }
                    if (yearsRead.length === 0) {
                        const dateStr = frontmatter['dateRead'] || frontmatter['dateAdded'];
                        if (typeof dateStr === 'string' && dateStr) {
                            const year = dateStr.split('-')[0];
                            if (year) yearsRead.push(year);
                        } else {
                            yearsRead.push("Unknown");
                        }
                    }

                    for (const year of new Set(yearsRead)) {
                        if (!booksByYear[year]) booksByYear[year] = [];
                        booksByYear[year].push(file);
                    }
                }

                if (frontmatter['currentlyReading'] === true || frontmatter['currentlyReading'] === 'true') {
                    currentlyReading.push(file);
                }
            }
        }

        // Render Stats
        this.renderStatCard(content, "Total books in library", allBooks.length.toString(), allBooks);
        this.renderStatCard(content, "Books read", readBooks.length.toString(), this.sortBooksByMostRecentlyRead(readBooks));
        this.renderStatCard(content, "Currently reading", currentlyReading.length.toString(), this.sortBooksByMostRecentlyRead(currentlyReading));

        // Custom Pages Render (Sorted by page count)
        const sortedPages = pagesData.sort((a, b) => b.pages - a.pages);
        this.renderStatCard(content, "Total pages read", totalPagesRead.toLocaleString(), sortedPages.map(p => p.file), (file) => {
            const data = sortedPages.find(sp => sp.file === file);
            return data ? `${data.pages} p.` : '';
        }, totalUniquePagesRead.toLocaleString());

        this.renderReadingChallenge(content, booksByYear);
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

    private renderReadingChallenge(container: HTMLElement, booksByYear: Record<string, TFile[]>) {
        const challengeContainer = container.createEl('div', { cls: 'librarian-challenge-container' });
        challengeContainer.createEl('div', { text: 'Reading Challenge', cls: 'librarian-view-header', attr: { style: 'margin-top: 1.5rem;' } });

        const currentYear = new Date().getFullYear().toString();
        const thisYearBooks = this.sortBooksByMostRecentlyRead(booksByYear[currentYear] || []);
        const goal = this.plugin.settings.readingGoal || 50;
        
        const progressContainer = challengeContainer.createEl('div', { cls: 'librarian-challenge-progress' });
        progressContainer.createEl('div', { text: `${currentYear} Goal: ${thisYearBooks.length} / ${goal} books`, cls: 'librarian-challenge-text' });
        
        const progressBar = progressContainer.createEl('progress', { cls: 'librarian-progress-bar' });
        progressBar.setAttribute('value', thisYearBooks.length.toString());
        progressBar.setAttribute('max', goal.toString());

        this.renderStatCard(challengeContainer, `Books read in ${currentYear}`, thisYearBooks.length.toString(), thisYearBooks);

        const years = Object.keys(booksByYear).filter(y => y !== currentYear && y !== "Unknown").sort((a, b) => b.localeCompare(a));
        if (years.length > 0) {
            challengeContainer.createEl('div', { text: 'Previous Years', cls: 'librarian-view-header librarian-historical-header', attr: { style: 'margin-top: 1.5rem;' } });
            for (const year of years) {
                const yearBooks = this.sortBooksByMostRecentlyRead(booksByYear[year] || []);
                if (yearBooks && yearBooks.length > 0) {
                    this.renderStatCard(challengeContainer, `Books read in ${year}`, yearBooks.length.toString(), yearBooks);
                }
            }
        }
        
        const unknownYearBooks = booksByYear["Unknown"];
        if (unknownYearBooks && unknownYearBooks.length > 0) {
            const sortedUnknown = this.sortBooksByMostRecentlyRead(unknownYearBooks);
            this.renderStatCard(challengeContainer, `Books read in Unknown Year`, sortedUnknown.length.toString(), sortedUnknown);
        }
    }

    private getLatestReadDate(file: TFile): string {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        if (!frontmatter) return "";

        let latestDate = "";

        if (frontmatter['readHistory'] && Array.isArray(frontmatter['readHistory'])) {
            for (const session of frontmatter['readHistory']) {
                if (session.end && session.end !== "DNF" && session.end > latestDate) {
                    latestDate = session.end;
                }
            }
        }

        if (!latestDate) {
            const dateStr = frontmatter['dateRead'] || frontmatter['dateAdded'];
            if (typeof dateStr === 'string' && dateStr) {
                latestDate = dateStr;
            }
        }

        return latestDate;
    }

    private sortBooksByMostRecentlyRead(books: TFile[]): TFile[] {
        // Create a copy to avoid mutating the original array
        return [...books].sort((a, b) => {
            const dateA = this.getLatestReadDate(a);
            const dateB = this.getLatestReadDate(b);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1; // a goes to bottom
            if (!dateB) return -1; // b goes to bottom

            return dateB.localeCompare(dateA); // most recent on top
        });
    }
}
