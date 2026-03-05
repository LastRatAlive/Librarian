import { App, SuggestModal, TFile, Notice } from 'obsidian';
import LibrarianPlugin from './main';

export class ShelfSelectionModal extends SuggestModal<string> {
    plugin: LibrarianPlugin;
    file: TFile;

    constructor(app: App, plugin: LibrarianPlugin, file: TFile) {
        super(app);
        this.plugin = plugin;
        this.file = file;
        this.setPlaceholder('Type to search or create a shelf...');
    }

    getSuggestions(query: string): string[] {
        const allFiles = this.app.vault.getMarkdownFiles();
        const existingShelves = new Set<string>();

        // Gather all unique shelves currently in the vault
        for (const file of allFiles) {
            const cache = this.app.metadataCache.getFileCache(file);
            const shelves = cache?.frontmatter?.['shelf'];
            if (Array.isArray(shelves)) {
                shelves.forEach(s => existingShelves.add(s));
            } else if (typeof shelves === 'string') {
                existingShelves.add(shelves);
            }
        }

        const suggestions = Array.from(existingShelves).filter(s =>
            s.toLowerCase().includes(query.toLowerCase())
        );

        // Allow creating a new shelf if query doesn't match exactly
        if (query.trim() !== '' && !suggestions.includes(query)) {
            suggestions.push(`Create new shelf: "${query}"`);
        }

        return suggestions;
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.createEl('div', { text: value });
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        let shelfName = item;
        if (item.startsWith('Create new shelf: "')) {
            shelfName = item.substring('Create new shelf: "'.length, item.length - 1);
        }

        await this.plugin.app.fileManager.processFrontMatter(this.file, (fm) => {
            if (!fm['shelf']) {
                fm['shelf'] = [];
            }

            // If it's a string, convert to array
            if (typeof fm['shelf'] === 'string') {
                fm['shelf'] = [fm['shelf']];
            }

            if (Array.isArray(fm['shelf'])) {
                if (!fm['shelf'].includes(shelfName)) {
                    fm['shelf'].push(shelfName);
                    new Notice(`Added to shelf: ${shelfName}`);
                } else {
                    // Toggle off if already present (optional behavior, but maybe just notify)
                    fm['shelf'] = fm['shelf'].filter((s: string) => s !== shelfName);
                    new Notice(`Removed from shelf: ${shelfName}`);
                }
            }
        });
    }
}
