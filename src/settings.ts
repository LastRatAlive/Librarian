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
	bookTemplate: `---
type: book
title: "{{title}}"
author: "{{author}}"
pages: {{pages}}
year: "{{year}}"
image: "{{cover}}"
isbn: "{{isbn}}"
tags: mediaDB/book
dateAdded: {{dateAdded}}
readCount: 0
currentlyReading: false
---
# {{title}} - {{author}}

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

		containerEl.createEl('h2', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Default Book Folder')
			.setDesc('Folder where new books will be saved. Must exist.')
			.addText(text => text
				.setPlaceholder('Books/')
				.setValue(this.plugin.settings.defaultBookFolder)
				.onChange(async (value) => {
					this.plugin.settings.defaultBookFolder = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', { text: 'UI Customization' });

		new Setting(containerEl)
			.setName('Show Bookshelves Ribbon Icon')
			.setDesc('Add a bookshelf icon to the left ribbon.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showShelfRibbon)
				.onChange(async (value) => {
					this.plugin.settings.showShelfRibbon = value;
					await this.plugin.saveSettings();
					new Notice('Please reload the plugin to see ribbon changes.');
				}));

		new Setting(containerEl)
			.setName('Show Stats Ribbon Icon')
			.setDesc('Add a bar chart icon to the left ribbon.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showStatsRibbon)
				.onChange(async (value) => {
					this.plugin.settings.showStatsRibbon = value;
					await this.plugin.saveSettings();
					new Notice('Please reload the plugin to see ribbon changes.');
				}));

		new Setting(containerEl)
			.setName('Show Note Action Buttons')
			.setDesc('Enable "Start Reading", "Finished", "Add Quote", etc. buttons in book headers.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNoteButtons)
				.onChange(async (value) => {
					this.plugin.settings.showNoteButtons = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', { text: 'Book Note Template' });
		containerEl.createEl('p', {
			text: 'Customize the initial content of your book notes. Use {{title}}, {{author}}, {{pages}}, {{year}}, {{cover}}, {{cover_image}}, {{isbn}}, {{id}}, {{dateAdded}} placeholders.'
		}).style.fontSize = '0.8em';

		new Setting(containerEl)
			.setName('Note Template')
			.setDesc('The skeleton for every new book note.')
			.addTextArea(text => text
				.setPlaceholder('Template text...')
				.setValue(this.plugin.settings.bookTemplate)
				.onChange(async (value) => {
					this.plugin.settings.bookTemplate = value;
					await this.plugin.saveSettings();
				})
				.inputEl.style.height = '300px'
			).controlEl.style.width = '100%';

		containerEl.createEl('h2', { text: 'Metadata Controls' });

		const propContainer = containerEl.createDiv();
		propContainer.createEl('p', { text: 'Select which core properties to include in new books:' }).style.fontSize = '0.9em';

		const properties = Object.keys(this.plugin.settings.enabledProperties);
		for (const prop of properties) {
			new Setting(propContainer)
				.setName(prop)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enabledProperties[prop] ?? true)
					.onChange(async (value) => {
						this.plugin.settings.enabledProperties[prop] = value;
						await this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName('Additional Properties')
			.setDesc('Any extra YAML key-value pairs to add (e.g., "owned: true").')
			.addTextArea(text => text
				.setPlaceholder('key: value')
				.setValue(this.plugin.settings.additionalProperties)
				.onChange(async (value) => {
					this.plugin.settings.additionalProperties = value;
					await this.plugin.saveSettings();
				}));
	}
}

