import { App, Modal, Setting, TFile, Notice } from 'obsidian';
import LibrarianPlugin from './main';

interface BookFrontmatter {
    type?: string;
    author?: string;
}

export class QuoteModal extends Modal {
    plugin: LibrarianPlugin;
    file: TFile;
    quoteText: string = "";
    pageReference: string = "";
    quoteTags: string = "";

    constructor(app: App, plugin: LibrarianPlugin, file: TFile) {
        super(app);
        this.plugin = plugin;
        this.file = file;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Add quote' });

        new Setting(contentEl)
            .setName('Quote')
            .setDesc('Paste or type the quote here.')
            .addTextArea(text => text
                .setPlaceholder('Enter quote...')
                .onChange(value => this.quoteText = value));

        new Setting(contentEl)
            .setName('Tags')
            .setDesc('Add tags to categorize this quote (e.g., #philosophy #important)')
            .addText(text => text
                .setPlaceholder('#tag1 #tag2')
                .onChange(value => this.quoteTags = value));

        new Setting(contentEl)
            .setName('Page / timestamp')
            .setDesc('Optional reference (e.g., page 42 or 12:45)')
            .addText(text => text
                .setPlaceholder('Reference...')
                .onChange(value => this.pageReference = value));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Add to book')
                .setCta()
                .onClick(() => {
                    void this.addQuote();
                }));
    }

    async addQuote() {
        if (!this.quoteText.trim()) {
            new Notice('Quote cannot be empty');
            return;
        }

        const bookSlug = this.file.basename.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
        const randomId = Math.floor(100 + Math.random() * 900);
        const blockId = `quote-${bookSlug}-${randomId}`;

        const content = await this.app.vault.read(this.file);

        const tags = this.quoteTags.trim() ? ` ${this.quoteTags.trim()}` : "";
        let newQuoteBlock = `\n> "${this.quoteText.trim()}"${tags} ^${blockId}\n`;
        if (this.pageReference.trim()) {
            newQuoteBlock += `— ${this.pageReference.trim()}\n`;
        }

        let updatedContent = content;
        const quotesHeader = "## Quotes";

        if (content.includes(quotesHeader)) {
            // Append after the header
            updatedContent = content.replace(quotesHeader, `${quotesHeader}\n${newQuoteBlock}`);
        } else {
            // Add header at the end or before Notes
            if (content.includes("## Notes")) {
                updatedContent = content.replace("## Notes", `${quotesHeader}\n${newQuoteBlock}\n## Notes`);
            } else {
                updatedContent = content + `\n\n${quotesHeader}\n${newQuoteBlock}`;
            }
        }

        await this.app.vault.modify(this.file, updatedContent);
        this.close();

        // Copy Rich Reference Notice
        const notice = new Notice('', 8000);
        // Safer way to access noticeEl without matching internal private members
        const noticeEl = (notice as unknown as { noticeEl: HTMLElement }).noticeEl;
        noticeEl.empty();

        noticeEl.createEl('div', { text: 'Quote added', cls: 'librarian-notice-title' });
        const btnContainer = noticeEl.createDiv({ cls: 'librarian-notice-btns librarian-notice-margin' });

        const copyBtn = btnContainer.createEl('button', { text: 'Copy rich reference' });
        copyBtn.onclick = () => {
            void (async () => {
                const cache = this.app.metadataCache.getFileCache(this.file);
                const frontmatter = cache?.frontmatter as BookFrontmatter | undefined;
                const author = frontmatter?.author || 'Unknown';
                const richRef = `> "${this.quoteText.trim()}" — ${author}, [[${this.file.basename}]]`;
                await navigator.clipboard.writeText(richRef);
                new Notice('Copied to clipboard');
            })();
        };
    }

    onClose() {
        this.contentEl.empty();
    }
}
