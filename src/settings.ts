import { App, PluginSettingTab, Setting } from "obsidian";
import LibrarianPlugin from "./main";

export interface LibrarianSettings {
	defaultBookFolder: string;
}

export const DEFAULT_SETTINGS: LibrarianSettings = {
	defaultBookFolder: '/'
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
			.setName('Default Book Folder')
			.setDesc('Folder where new books will be saved. Must exist.')
			.addText(text => text
				.setPlaceholder('Books/')
				.setValue(this.plugin.settings.defaultBookFolder)
				.onChange(async (value) => {
					this.plugin.settings.defaultBookFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
