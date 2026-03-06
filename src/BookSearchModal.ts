import { App, Notice, SuggestModal, requestUrl } from 'obsidian';
import LibrarianPlugin from './main';
import { DEFAULT_SETTINGS } from './settings';

interface BookSearchResult {
    key: string;
    title: string;
    author_name?: string[];
    first_publish_year?: number;
    cover_i?: number; // OpenLibrary cover ID
    isbn?: string[];
    number_of_pages_median?: number;
}

export class BookSearchModal extends SuggestModal<BookSearchResult> {
    plugin: LibrarianPlugin;

    // Simple debounce timer
    private debounceTimer: number | null = null;
    // Store latest results to feed to getSuggestions
    private lastResults: BookSearchResult[] = [];

    constructor(app: App, plugin: LibrarianPlugin) {
        super(app);
        this.plugin = plugin;
        this.setPlaceholder('Search open library (e.g. "dune frank herbert")');

        // SuggestModal uses 250ms delay internally for getSuggestions, but we 
        // want to avoid hammering the API if the user types fast.
        this.emptyStateText = 'Type a book title to search';
    }

    async getSuggestions(query: string): Promise<BookSearchResult[]> {
        if (query.trim().length < 3) return [];

        // We return a promise that resolves when the API call finishes.
        return new Promise((resolve) => {
            if (this.debounceTimer !== null) {
                window.clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = window.setTimeout(() => {
                void this.performSearch(query, resolve);
            }, 400); // 400ms debounce
        });
    }

    private async performSearch(query: string, resolve: (value: BookSearchResult[]) => void) {
        try {
            const encodedQuery = encodeURIComponent(query);
            const response = await requestUrl({
                url: `https://openlibrary.org/search.json?q=${encodedQuery}&limit=10&fields=key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median`,
            });

            const data = response.json as { docs: BookSearchResult[] };
            this.lastResults = data.docs;
            resolve(this.lastResults);
        } catch (e) {
            console.error('OpenLibrary search error', e);
            new Notice('Failed to search open library');
            resolve([]);
        }
    }

    renderSuggestion(book: BookSearchResult, el: HTMLElement) {
        const author = book.author_name ? book.author_name[0] : 'Unknown Author';
        const year = book.first_publish_year ? ` (${book.first_publish_year})` : '';

        el.createEl('div', { text: `${book.title}${year}` });
        el.createEl('small', { text: author, cls: 'librarian-suggestion-author' });
    }

    onChooseSuggestion(book: BookSearchResult, evt: MouseEvent | KeyboardEvent) {
        void this.addBookToVault(book);
    }

    private async addBookToVault(book: BookSearchResult) {
        const author = (book.author_name && book.author_name.length > 0) ? book.author_name[0] || '' : '';
        const year = book.first_publish_year ? `${book.first_publish_year}` : '';
        const cover = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : '';
        const isbn = (book.isbn && book.isbn.length > 0) ? book.isbn[0] || '' : '';
        const pages = book.number_of_pages_median || 0;
        const dateAdded = new Date().toISOString().split('T')[0] ?? "";

        // Clean up title for filename
        const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, '');

        // Generate dynamic frontmatter and body
        const enabledProps = this.plugin.settings.enabledProperties;
        let fmLines: string[] = ["---"];

        const addFM = (key: string, value: string | number | boolean) => {
            if (enabledProps[key]) {
                if (typeof value === 'string') {
                    fmLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
                } else {
                    fmLines.push(`${key}: ${value}`);
                }
            }
        };

        fmLines.push('type: book');
        addFM('title', book.title);
        addFM('englishTitle', book.title);
        addFM('year', year);
        addFM('dataSource', 'OpenLibrary');
        addFM('id', book.key.replace('/works/', ''));
        addFM('author', author);
        fmLines.push(`pages: ${pages}`);
        addFM('image', cover);
        addFM('isbn', isbn);
        addFM('tags', '');
        addFM('dateAdded', dateAdded);
        fmLines.push('readCount: 0');
        fmLines.push('currentlyReading: false');
        addFM('myRating', 0);

        if (this.plugin.settings.additionalProperties && this.plugin.settings.additionalProperties.trim()) {
            fmLines.push(this.plugin.settings.additionalProperties.trim());
        }
        fmLines.push("---");
        const generatedFM = fmLines.join("\n");

        let body = this.plugin.settings.bookTemplate || DEFAULT_SETTINGS.bookTemplate;
        const placeholders: { [key: string]: string } = {
            '{{title}}': book.title,
            '{{author}}': author,
            '{{pages}}': pages.toString(),
            '{{year}}': year,
            '{{cover}}': cover,
            '{{cover_image}}': cover ? `![](${cover})` : '',
            '{{isbn}}': isbn,
            '{{id}}': book.key.replace('/works/', ''),
            '{{dateAdded}}': dateAdded
        };

        for (const [key, value] of Object.entries(placeholders)) {
            body = body.split(key).join(value);
        }

        const finalContent = `${generatedFM}\n${body}`;

        // Normalize folder path (remove leading/trailing slashes)
        let folderPath = this.plugin.settings.defaultBookFolder || '';
        folderPath = folderPath.replace(/^\/+|\/+$/g, '');

        let fileName = `${safeTitle}.md`;
        let fullPath = folderPath === '' ? fileName : `${folderPath}/${fileName}`;

        // Add number to filename if it already exists
        let i = 1;
        while (this.app.vault.getAbstractFileByPath(fullPath)) {
            fileName = `${safeTitle} (${i}).md`;
            fullPath = folderPath === '' ? fileName : `${folderPath}/${fileName}`;
            i++;
        }

        try {
            // Check and create nested folders if needed
            if (folderPath !== '') {
                const folders = folderPath.split('/');
                let currentPath = '';

                for (const folder of folders) {
                    currentPath = currentPath === '' ? folder : `${currentPath}/${folder}`;
                    const folderExists = this.app.vault.getAbstractFileByPath(currentPath);
                    if (!folderExists) {
                        await this.app.vault.createFolder(currentPath);
                    }
                }
            }

            const file = await this.app.vault.create(fullPath, finalContent);

            // Open the newly created note
            void this.app.workspace.getLeaf(false).openFile(file);

            new Notice(`Added ${book.title} to your library`);
        } catch (error) {
            console.error("Error creating book note:", error);
            new Notice("Error creating book note. Does the target folder exist?");
        }
    }
}
