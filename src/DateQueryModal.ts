import { App, Modal, Setting, Notice } from 'obsidian';
import LibrarianPlugin from './main';
import { getBooksActiveOnDate } from './BookUtils';

export class DateQueryModal extends Modal {
    plugin: LibrarianPlugin;
    queryDate: string;

    constructor(app: App, plugin: LibrarianPlugin) {
        super(app);
        this.plugin = plugin;
        this.queryDate = new Date().toISOString().split('T')[0] || ''; // Default to today
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'What was I reading' });


        new Setting(contentEl)
            .setName('Select date:')
            .setDesc('Find books active on this day.')
            .addText(text => text
                .setPlaceholder('Date')
                .setValue(this.queryDate)
                .onChange(value => {
                    this.queryDate = value;
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Search')
                .setCta()
                .onClick(() => {
                    this.renderResults();
                }));

        contentEl.createEl('div', { cls: 'librarian-query-results' });
    }

    private renderResults() {
        const resultsEl = this.contentEl.querySelector('.librarian-query-results');
        if (!resultsEl) return;
        resultsEl.empty();

        const selectedDate = new Date(this.queryDate);
        if (isNaN(selectedDate.getTime())) {
            new Notice('Invalid date format');
            return;
        }

        const matches = getBooksActiveOnDate(this.app, this.queryDate);

        if (matches.length === 0) {
            resultsEl.createEl('p', { text: `No reading history found for ${this.queryDate}` });
        } else {
            resultsEl.createEl('div', { text: `Results for ${this.queryDate}:`, cls: 'librarian-query-results-header' });
            const list = resultsEl.createEl('ul');
            for (const file of matches) {
                const li = list.createEl('li');
                const link = li.createEl('a', { text: file.basename, cls: 'is-clickable' });
                link.onclick = () => {
                    void this.app.workspace.getLeaf(false).openFile(file);
                    this.close();
                };
            }
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
