import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import LibrarianPlugin from './main';

export const SHELF_VIEW_TYPE = 'librarian-shelf-view';

export class ShelfView extends ItemView {
    plugin: LibrarianPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: LibrarianPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return SHELF_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Bookshelves';
    }

    getIcon(): string {
        return 'library';
    }

    async onOpen() {
        // Re-render when files change
        this.registerEvent(this.app.metadataCache.on('resolved', () => this.render()));
        this.render();
    }

    async onClose() {
        // Cleanup if needed
    }

    async render() {
        const container = this.containerEl.children[1];
        if (!container) return;
        container.empty();

        const header = container.createEl('div', { cls: 'nav-header' });
        header.createEl('h3', { text: 'Bookshelves', cls: 'nav-folder-title' });

        const content = container.createEl('div', { cls: 'nav-folder librarian-shelf-view' });
        content.style.marginTop = '10px';

        // 1. Find all books and group them by shelf
        const allFiles = this.app.vault.getMarkdownFiles();
        const shelves: Record<string, TFile[]> = {};
        const noShelf: TFile[] = [];

        for (const file of allFiles) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.['type'] === 'book') {
                let bookShelves = cache.frontmatter['shelf'];

                // Handle both string and array formats for frontmatter
                if (!bookShelves) {
                    noShelf.push(file);
                    continue;
                }

                if (typeof bookShelves === 'string') {
                    bookShelves = [bookShelves];
                }

                if (Array.isArray(bookShelves)) {
                    for (const shelf of bookShelves) {
                        if (!shelves[shelf]) shelves[shelf] = [];
                        shelves[shelf].push(file);
                    }
                } else {
                    noShelf.push(file);
                }
            }
        }

        // 2. Render each shelf group
        const sortedShelfNames = Object.keys(shelves).sort();

        for (const shelfName of sortedShelfNames) {
            const shelfBooks = shelves[shelfName];
            if (shelfBooks) {
                this.renderShelf(content, shelfName, shelfBooks);
            }
        }

        // 3. Render unshelved books
        if (noShelf.length > 0) {
            this.renderShelf(content, 'Unshelved', noShelf);
        }
    }

    private renderShelf(container: HTMLElement, shelfName: string, books: TFile[]) {
        const shelfContainer = container.createEl('div', { cls: 'tree-item nav-folder' });

        // Shelf Header
        const header = shelfContainer.createEl('div', { cls: 'tree-item-self is-clickable nav-folder-title' });
        header.createEl('div', { cls: 'tree-item-inner nav-folder-title-content', text: `${shelfName} (${books.length})` });

        // Book List
        const children = shelfContainer.createEl('div', { cls: 'tree-item-children nav-folder-children' });

        for (const book of books) {
            const cache = this.app.metadataCache.getFileCache(book);
            const title = cache?.frontmatter?.['title'] || book.basename;

            const bookEl = children.createEl('div', { cls: 'tree-item nav-file' });
            const bookTitle = bookEl.createEl('div', { cls: 'tree-item-self is-clickable nav-file-title' });
            bookTitle.createEl('div', { cls: 'tree-item-inner nav-file-title-content', text: title });

            // Click to open the note
            bookTitle.onclick = async (e) => {
                const leaf = this.app.workspace.getLeaf(e.ctrlKey || e.metaKey);
                await leaf.openFile(book);
            };
        }
    }
}
