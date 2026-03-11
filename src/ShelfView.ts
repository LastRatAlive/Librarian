import { ItemView, WorkspaceLeaf, TFile, setIcon } from 'obsidian';
import LibrarianPlugin from './main';

export const SHELF_VIEW_TYPE = 'librarian-shelf-view';

interface BookFrontmatter {
    type?: string;
    shelf?: string | string[];
    title?: string;
}

export class ShelfView extends ItemView {
    plugin: LibrarianPlugin;
    collapsedShelves: Set<string> = new Set();

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

    render() {
        const container = this.containerEl.children[1];
        if (!container) return;
        container.empty();

        const header = container.createEl('div', { cls: 'nav-header' });
        header.createEl('div', { text: 'Bookshelves', cls: 'nav-folder-title librarian-view-header' });

        const content = container.createEl('div', { cls: 'nav-folder librarian-shelf-view' });

        // 1. Find all books and group them by shelf
        const allFiles = this.app.vault.getMarkdownFiles();
        const shelves: Record<string, TFile[]> = {};
        const noShelf: TFile[] = [];

        for (const file of allFiles) {
            const cache = this.app.metadataCache.getFileCache(file);
            const frontmatter = cache?.frontmatter as unknown as BookFrontmatter | undefined;

            if (frontmatter?.type === 'book') {
                const bookShelves = frontmatter.shelf;

                // Handle both string and array formats for frontmatter
                if (!bookShelves) {
                    noShelf.push(file);
                    continue;
                }

                if (typeof bookShelves === 'string') {
                    const shelf = bookShelves;
                    if (!shelves[shelf]) shelves[shelf] = [];
                    shelves[shelf].push(file);
                } else if (Array.isArray(bookShelves)) {
                    for (const shelf of bookShelves) {
                        if (typeof shelf === 'string') {
                            if (!shelves[shelf]) shelves[shelf] = [];
                            shelves[shelf].push(file);
                        }
                    }
                } else {
                    noShelf.push(file);
                }
            }
        }

        // 2. Render each shelf group
        const sortedShelfNames = Object.keys(shelves).sort();

        // Use a fragment
        const fragment = document.createDocumentFragment();
        for (const shelfName of sortedShelfNames) {
            const shelfBooks = shelves[shelfName];
            if (shelfBooks) {
                this.renderShelf(fragment, shelfName, shelfBooks);
            }
        }

        // 3. Render unshelved books
        if (noShelf.length > 0) {
            this.renderShelf(fragment, 'Unshelved', noShelf);
        }
        content.appendChild(fragment);
    }

    private renderShelf(parent: DocumentFragment | HTMLElement, shelfName: string, books: TFile[]) {
        const isCollapsed = this.collapsedShelves.has(shelfName);
        const shelfContainer = parent.createEl('div', { 
            cls: `tree-item nav-folder ${isCollapsed ? 'is-collapsed' : ''}` 
        });

        // Shelf Header
        const header = shelfContainer.createEl('div', { cls: 'tree-item-self is-clickable nav-folder-title' });
        
        // Collapse Icon
        const iconContainer = header.createEl('div', { cls: 'tree-item-icon collapse-icon nav-folder-collapse-indicator' });
        setIcon(iconContainer, 'right-triangle');

        const titleEl = header.createEl('div', { cls: 'tree-item-inner nav-folder-title-content' });
        titleEl.createEl('span', { text: shelfName });
        titleEl.createEl('span', { text: `${books.length}`, cls: 'nav-folder-tag librarian-shelf-count' });

        // Book List - use is-hidden to control visibility manually
        const children = shelfContainer.createEl('div', { 
            cls: `tree-item-children nav-folder-children ${isCollapsed ? 'is-hidden' : ''}` 
        });

        const bookFragment = document.createDocumentFragment();
        for (const book of books) {
            const cache = this.app.metadataCache.getFileCache(book);
            const frontmatter = cache?.frontmatter as unknown as BookFrontmatter | undefined;
            const title = frontmatter?.title || book.basename;

            const bookEl = bookFragment.createEl('div', { cls: 'tree-item nav-file' });
            const bookTitle = bookEl.createEl('div', { cls: 'tree-item-self is-clickable nav-file-title' });
            bookTitle.createEl('div', { cls: 'tree-item-inner nav-file-title-content', text: title });

            // Click to open the note
            bookTitle.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                void this.app.workspace.getLeaf(e.ctrlKey || e.metaKey).openFile(book);
            };
        }
        children.appendChild(bookFragment);

        // Toggle logic
        header.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.collapsedShelves.has(shelfName)) {
                this.collapsedShelves.delete(shelfName);
            } else {
                this.collapsedShelves.add(shelfName);
            }
            void this.render();
        };
    }
}
