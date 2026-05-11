import { App, Notice, SuggestModal, requestUrl } from 'obsidian';
import LibrarianPlugin from './main';
import { BookData, createBookNote } from './BookCreator';

interface BookSearchResult {
    key: string;
    title: string;
    author_name?: string[];
    first_publish_year?: number;
    cover_i?: number; // OpenLibrary cover ID
    isbn?: string[];
    number_of_pages_median?: number;
    subject?: string[];
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
                url: `https://openlibrary.org/search.json?q=${encodedQuery}&limit=10&fields=key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject`,
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
        const bookData: BookData = {
            title: book.title,
            author: (book.author_name && book.author_name.length > 0) ? book.author_name[0] || '' : '',
            year: book.first_publish_year ? `${book.first_publish_year}` : '',
            cover: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : '',
            isbn: (book.isbn && book.isbn.length > 0) ? book.isbn[0] || '' : '',
            pages: book.number_of_pages_median || 0,
            subject: (book.subject && book.subject.length > 0) ? book.subject[0] || '' : '',
            id: book.key.replace('/works/', ''),
            dataSource: 'OpenLibrary'
        };

        void createBookNote(this.app, this.plugin, bookData);
    }
}
