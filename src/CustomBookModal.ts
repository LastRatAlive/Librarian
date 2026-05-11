import { App, Modal, Setting, Notice } from 'obsidian';
import LibrarianPlugin from './main';
import { BookData, createBookNote } from './BookCreator';

export class CustomBookModal extends Modal {
    plugin: LibrarianPlugin;

    title: string = "";
    author: string = "";
    pages: number = 0;
    year: string = "";
    isbn: string = "";
    cover: string = "";
    subject: string = "";

    constructor(app: App, plugin: LibrarianPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Add book manually' });

        new Setting(contentEl)
            .setName('Title')
            .setDesc('Required')
            .addText(text => text
                .setPlaceholder('Enter book title')
                .onChange(value => {
                    this.title = value;
                }));

        new Setting(contentEl)
            .setName('Author')
            .addText(text => text
                .setPlaceholder('Author name')
                .onChange(value => {
                    this.author = value;
                }));

        new Setting(contentEl)
            .setName('Pages')
            .addText(text => text
                .setPlaceholder('Number of pages')
                .onChange(value => {
                    const parsed = parseInt(value);
                    this.pages = isNaN(parsed) ? 0 : parsed;
                }));

        new Setting(contentEl)
            .setName('Publication year')
            .addText(text => text
                .setPlaceholder('Example: 2024')
                .onChange(value => {
                    this.year = value;
                }));

        new Setting(contentEl)
            .setName('ISBN')
            .addText(text => text
                .setPlaceholder('Example: 9780553293357')
                .onChange(value => {
                    this.isbn = value;
                }));

        new Setting(contentEl)
            .setName('Cover image URL')
            .addText(text => text
                .setPlaceholder('Enter cover image URL')
                .onChange(value => {
                    this.cover = value;
                }));

        new Setting(contentEl)
            .setName('Subject / genre')
            .addText(text => text
                .setPlaceholder('Example: science fiction')
                .onChange(value => {
                    this.subject = value;
                }));

        const btnContainer = contentEl.createDiv({ cls: 'librarian-modal-buttons' });

        const submitBtn = btnContainer.createEl('button', { text: 'Add book', cls: 'mod-cta' });
        submitBtn.onclick = () => {
            if (!this.title.trim()) {
                new Notice("Title is required.");
                return;
            }

            const randomId = `manual-${Math.random().toString(36).substring(2, 9)}`;

            const bookData: BookData = {
                title: this.title.trim(),
                author: this.author.trim(),
                pages: this.pages,
                year: this.year.trim(),
                isbn: this.isbn.trim(),
                cover: this.cover.trim(),
                subject: this.subject.trim(),
                id: randomId,
                dataSource: 'Manual Entry'
            };

            void createBookNote(this.app, this.plugin, bookData);
            this.close();
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
