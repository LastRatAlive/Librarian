import { App, Notice, PluginSettingTab, Setting, TFile, TFolder, AbstractInputSuggest } from "obsidian";
import LibrarianPlugin from "./main";

export interface LibrarianSettings {
	defaultBookFolder: string;
	templatePath: string;
	bookTemplate: string;
	showShelfRibbon: boolean;
	showStatsRibbon: boolean;
	showAddBookRibbon: boolean;
	showNoteButtons: boolean;
	enabledProperties: { [key: string]: boolean };
	additionalProperties: string;
}

export const DEFAULT_SETTINGS: LibrarianSettings = {
	defaultBookFolder: '/',
	templatePath: '',
	bookTemplate: `# {{title}} - {{author}}

{{cover_image}}

## Summary
(Write your thoughts here...)

## Quotes
> Add quotes here.

## Notes
- 
`,
	showShelfRibbon: true,
	showStatsRibbon: true,
	showAddBookRibbon: true,
	showNoteButtons: true,
	enabledProperties: {
		title: true,
		author: true,
		pages: true,
		year: true,
		image: true,
		isbn: true,
		tags: true,
		dateAdded: true,
		readCount: true,
		currentlyReading: true,
		shelf: true,
		myRating: true,
		id: true,
		dataSource: true,
		englishTitle: true
	},
	additionalProperties: ""
}

export class LibrarianSettingTab extends PluginSettingTab {
	plugin: LibrarianPlugin;

	constructor(app: App, plugin: LibrarianPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Plugin configuration')
			.setHeading();

		new Setting(containerEl)
			.setName('Default book folder')
			.setDesc('Folder where new books will be saved. Must exist.')
			.addText(text => {
				text.setPlaceholder('Books/')
					.setValue(this.plugin.settings.defaultBookFolder)
					.onChange((value) => {
						this.plugin.settings.defaultBookFolder = value;
						void this.plugin.saveSettings();
					});
				new FolderSuggest(this.app, text.inputEl);
			});

		new Setting(containerEl)
			.setName('Interface adjustments')
			.setHeading();

		new Setting(containerEl)
			.setName('Show bookshelves ribbon icon')
			.setDesc('Add a bookshelf icon to the left ribbon.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showShelfRibbon)
				.onChange((value) => {
					this.plugin.settings.showShelfRibbon = value;
					void this.plugin.saveSettings();
					new Notice('Please reload the plugin to see ribbon changes');
				}));

		new Setting(containerEl)
			.setName('Show stats ribbon icon')
			.setDesc('Add a bar chart icon to the left ribbon.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showStatsRibbon)
				.onChange((value) => {
					this.plugin.settings.showStatsRibbon = value;
					void this.plugin.saveSettings();
					new Notice('Please reload the plugin to see ribbon changes');
				}));

		new Setting(containerEl)
			.setName('Show add book ribbon icon')
			.setDesc('Add a plus icon to the left ribbon to quickly search and add books.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showAddBookRibbon)
				.onChange((value) => {
					this.plugin.settings.showAddBookRibbon = value;
					void this.plugin.saveSettings();
					new Notice('Please reload the plugin to see ribbon changes');
				}));

		new Setting(containerEl)
			.setName('Show note action buttons')
			.setDesc('Enable start reading, add quote, and other buttons in book headers.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNoteButtons)
				.onChange((value) => {
					this.plugin.settings.showNoteButtons = value;
					void this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note templates')
			.setHeading();

		containerEl.createEl('p', {
			text: 'Choose a markdown file in your vault to use as the body for new book notes.  Frontmatter is managed automatically via the property settings below.',
			cls: 'librarian-settings-intro'
		});

		new Setting(containerEl)
			.setName('Template file')
			.setDesc('Path to the markdown file to use as a template.')
			.addText(text => {
				text.setPlaceholder('templates/book-template.md')
					.setValue(this.plugin.settings.templatePath)
					.onChange(async (value) => {
						this.plugin.settings.templatePath = value;
						await this.plugin.saveSettings();
					});
				new FileSuggest(this.app, text.inputEl);
			});

		const placeholderContainer = containerEl.createDiv({ cls: 'librarian-placeholder-list' });
		placeholderContainer.createEl('p', { text: 'Available placeholders for your template file:', cls: 'librarian-settings-intro' });
		const ul = placeholderContainer.createEl('ul');
		const placeholders = [
			'{{title}} - The title of the book',
			'{{author}} - The primary author',
			'{{pages}} - Page count',
			'{{year}} - Publication year',
			'{{cover}} - URL of the cover image',
			'{{cover_image}} - Formatted markdown image ![]()',
			'{{isbn}} - ISBN-10 or ISBN-13',
			'{{id}} - Open Library Work ID',
			'{{dateAdded}} - Today\'s date (YYYY-MM-DD)'
		];
		placeholders.forEach(p => ul.createEl('li', { text: p }));

		new Setting(containerEl)
			.setName('Property management')
			.setHeading();

		containerEl.createEl('p', {
			text: 'The following core properties are required for the plugin to function (stats, shelving, and reading status) and are always included:',
			cls: 'librarian-settings-intro'
		});

		const coreProps = ['type', 'pages', 'readCount', 'currentlyReading'];
		coreProps.forEach(prop => {
			new Setting(containerEl)
				.setName(prop)
				.setDesc('Core plugin property')
				.addToggle(toggle => toggle
					.setValue(true)
					.setDisabled(true));
		});

		containerEl.createEl('p', {
			text: 'You can toggle the following optional metadata properties:',
			cls: 'librarian-settings-intro'
		});

		const allProps = Object.keys(this.plugin.settings.enabledProperties);
		const optionalProps = allProps.filter(p => !coreProps.includes(p));

		for (const prop of optionalProps) {
			new Setting(containerEl)
				.setName(prop)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enabledProperties[prop] ?? true)
					.onChange((value) => {
						this.plugin.settings.enabledProperties[prop] = value;
						void this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName('Additional properties')
			.setDesc('Any extra YAML key-value pairs to add (e.g. "owned: true").')
			.addTextArea(text => text
				.setPlaceholder('Key: value')
				.setValue(this.plugin.settings.additionalProperties)
				.onChange((value) => {
					this.plugin.settings.additionalProperties = value;
					void this.plugin.saveSettings();
				}));
	}
}

class FileSuggest extends AbstractInputSuggest<TFile> {
	inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.inputEl = inputEl;
	}

	getSuggestions(inputStr: string): TFile[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const files: TFile[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		abstractFiles.forEach((file) => {
			if (
				file instanceof TFile &&
				file.extension === 'md' &&
				file.path.toLowerCase().includes(lowerCaseInputStr)
			) {
				files.push(file);
			}
		});

		return files;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger('input');
		this.close();
	}
}

class FolderSuggest extends AbstractInputSuggest<TFolder> {
	inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.inputEl = inputEl;
	}

	getSuggestions(inputStr: string): TFolder[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const folders: TFolder[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		abstractFiles.forEach((file) => {
			if (
				file instanceof TFolder &&
				file.path.toLowerCase().includes(lowerCaseInputStr)
			) {
				folders.push(file);
			}
		});

		return folders;
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.path;
		this.inputEl.trigger('input');
		this.close();
	}
}
