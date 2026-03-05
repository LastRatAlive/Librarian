import { App, Notice, SuggestModal, TFile, requestUrl } from 'obsidian';
import LibrarianPlugin from './main';

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
    private debounceTimer: NodeJS.Timeout | null = null;
    // Store latest results to feed to getSuggestions
    private lastResults: BookSearchResult[] = [];

    constructor(app: App, plugin: LibrarianPlugin) {
        super(app);
        this.plugin = plugin;
        this.setPlaceholder('Search Open Library (e.g. "Dune Frank Herbert")');

        // SuggestModal uses 250ms delay internally for getSuggestions, but we 
        // want to avoid hammering the API if the user types fast.
        this.emptyStateText = 'Type a book title to search...';
    }

    async getSuggestions(query: string): Promise<BookSearchResult[]> {
        if (query.trim().length < 3) return [];

        // We return a promise that resolves when the API call finishes.
        return new Promise((resolve) => {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
                try {
                    const encodedQuery = encodeURIComponent(query);
                    const response = await requestUrl({
                        url: `https://openlibrary.org/search.json?q=${encodedQuery}&limit=10&fields=key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median`,
                    });

                    const data = response.json;
                    this.lastResults = data.docs || [];
                    resolve(this.lastResults);
                } catch (e) {
                    console.error('OpenLibrary Search Error', e);
                    new Notice('Failed to search Open Library');
                    resolve([]);
                }
            }, 400); // 400ms debounce
        });
    }

    renderSuggestion(book: BookSearchResult, el: HTMLElement) {
        const author = book.author_name ? book.author_name[0] : 'Unknown Author';
        const year = book.first_publish_year ? ` (${book.first_publish_year})` : '';

        el.createEl('div', { text: `${book.title}${year}` });
        el.createEl('small', { text: author, cls: 'librarian-suggestion-author' });
    }

    async onChooseSuggestion(book: BookSearchResult, evt: MouseEvent | KeyboardEvent) {
        const author = (book.author_name && book.author_name.length > 0) ? book.author_name[0] || '' : '';
        const year = book.first_publish_year ? `${book.first_publish_year}` : '';
        const cover = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : '';
        const isbn = book.isbn ? book.isbn[0] : '';
        const pages = book.number_of_pages_median || 0;
        const dateAdded = new Date().toISOString().split('T')[0];

        // Clean up title for filename
        const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, '');

        const frontmatter = `---
type: book
title: "${book.title.replace(/"/g, '\\"')}"
englishTitle: "${book.title.replace(/"/g, '\\"')}"
year: "${year}"
dataSource: OpenLibrary
id: "${book.key.replace('/works/', '')}"
author: "${author.replace(/"/g, '\\"')}"
pages: ${pages}
image: "${cover}"
isbn: "${isbn}"
tags: mediaDB/book
shelf: []
dateRead: ""
dateAdded: ${dateAdded}
readCount: 0
currentlyReading: false
myRating: 0
---
# ${safeTitle} - ${author}

${cover ? `![](${cover})` : ''}

## Summary
Write your thoughts here.

## Quotes
> Add quotes here.

## Notes
-
`;

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

            const file = await this.app.vault.create(fullPath, frontmatter);

            // Open the newly created note
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(file);

            new Notice(`Added ${book.title} to your library`);
        } catch (error) {
            console.error("Error creating book note:", error);
            new Notice("Error creating book note. Does the target folder exist?");
        }
    }
}
