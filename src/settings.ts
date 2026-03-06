import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import LibrarianPlugin from "./main";

export interface LibrarianSettings {
	defaultBookFolder: string;
	bookTemplate: string;
	showShelfRibbon: boolean;
	showStatsRibbon: boolean;
	showNoteButtons: boolean;
	enabledProperties: { [key: string]: boolean };
	additionalProperties: string;
}

export const DEFAULT_SETTINGS: LibrarianSettings = {
	defaultBookFolder: '/',
	bookTemplate: `# {{title}} - {{author}}

{{cover_image}}

## Summary
Write your thoughts here.

## Quotes
> Add quotes here.

## Notes
- 
`,
	showShelfRibbon: true,
	showStatsRibbon: true,
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
			.addText(text => text
				.setPlaceholder('Books/')
				.setValue(this.plugin.settings.defaultBookFolder)
				.onChange((value) => {
					this.plugin.settings.defaultBookFolder = value;
					void this.plugin.saveSettings();
				}));

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
			text: 'Customize the body content of your book notes. Note: frontmatter is managed automatically via the property settings below.',
			cls: 'librarian-settings-intro'
		});

		new Setting(containerEl)
			.setName('Note body template')
			.setDesc('The template for the content below the frontmatter.')
			.addTextArea(text => {
				text.setPlaceholder('Template text...')
					.setValue(this.plugin.settings.bookTemplate)
					.onChange((value) => {
						this.plugin.settings.bookTemplate = value;
						void this.plugin.saveSettings();
					});
				text.inputEl.addClass('librarian-settings-template-area');
			});

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
