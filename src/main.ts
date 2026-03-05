import { App, MarkdownView, Plugin, TFile, Notice, WorkspaceLeaf } from 'obsidian';
import { LibrarianSettings, DEFAULT_SETTINGS, LibrarianSettingTab } from './settings';
import { BookSearchModal } from './BookSearchModal';
import { ShelfView, SHELF_VIEW_TYPE } from './ShelfView';

export default class LibrarianPlugin extends Plugin {
	settings: LibrarianSettings;

	async onload() {
		console.log('Loading Librarian plugin');

		// Check when a file is opened
		this.registerEvent(
			this.app.workspace.on('file-open', (file: TFile | null) => {
				this.updateActiveView(file);
			})
		);

		// Also check when metadata finishes processing (fixes new book creation delay)
		this.registerEvent(
			this.app.metadataCache.on('changed', (file: TFile) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && file.path === activeFile.path) {
					this.updateActiveView(file);
				}
			})
		);

		// Also check the currently active file on load
		this.app.workspace.onLayoutReady(() => {
			this.updateActiveView(this.app.workspace.getActiveFile());
		});

		this.addCommand({
			id: 'librarian-open-shelves',
			name: 'Open Bookshelves',
			callback: () => {
				this.activateShelfView();
			}
		});

		// Load settings and add settings tab
		await this.loadSettings();
		this.addSettingTab(new LibrarianSettingTab(this.app, this));

		// Search and Add Book Command
		this.addCommand({
			id: 'librarian-add-book',
			name: 'Add Book (Search Open Library)',
			callback: () => {
				new BookSearchModal(this.app, this).open();
			}
		});

		// Fallback commands for users who prefer Command Palette
		this.addCommand({
			id: 'librarian-start-reading',
			name: 'Start Reading (Update Frontmatter)',
			checkCallback: (checking: boolean) => this.runCommand(checking, 'start')
		});

		this.addCommand({
			id: 'librarian-finish-reading',
			name: 'Finish Reading (Update Frontmatter)',
			checkCallback: (checking: boolean) => this.runCommand(checking, 'finish')
		});

		this.addCommand({
			id: 'librarian-dnf',
			name: 'Didn\'t Finish Reading (Update Frontmatter)',
			checkCallback: (checking: boolean) => this.runCommand(checking, 'dnf')
		});
	}

	onunload() {
		console.log('Unloading Librarian plugin');
		this.removeButtonsFromAllViews();
	}

	private updateActiveView(file: TFile | null) {
		this.removeButtonsFromAllViews(); // Clear old buttons first

		if (!file) return;

		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		// Only show on books
		if (frontmatter?.['type'] === 'book') {
			this.injectButtons(file, frontmatter);
		}
	}

	private injectButtons(file: TFile, frontmatter: any) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const container = view.containerEl.querySelector('.view-header');
		if (!container) return;

		// Create our button container in the header
		const buttonContainer = container.createEl('div', { cls: 'librarian-button-container' });
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '8px';
		buttonContainer.style.alignItems = 'center';
		buttonContainer.style.padding = '0 10px';

		const currentlyReading = frontmatter['currentlyReading'] === true || frontmatter['currentlyReading'] === 'true';

		if (!currentlyReading) {
			const startBtn = buttonContainer.createEl('button', { text: '▶ Start Reading' });
			startBtn.onclick = () => this.updateReadingStatus(file, 'start');
		} else {
			const finishBtn = buttonContainer.createEl('button', { text: '✅ Finished' });
			finishBtn.onclick = () => this.updateReadingStatus(file, 'finish');

			const dnfBtn = buttonContainer.createEl('button', { text: '❌ Didn\'t Finish' });
			dnfBtn.onclick = () => this.updateReadingStatus(file, 'dnf');
		}
	}

	private removeButtonsFromAllViews() {
		document.querySelectorAll('.librarian-button-container').forEach(el => el.remove());
	}

	private runCommand(checking: boolean, action: 'start' | 'finish' | 'dnf'): boolean {
		const file = this.app.workspace.getActiveFile();
		if (!file) return false;

		const cache = this.app.metadataCache.getFileCache(file);
		if (cache?.frontmatter?.['type'] === 'book') {
			if (!checking) {
				this.updateReadingStatus(file, action);
			}
			return true;
		}
		return false;
	}

	private async updateReadingStatus(file: TFile, action: 'start' | 'finish' | 'dnf') {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

			if (action === 'start') {
				fm['currentlyReading'] = true;

				// Increment read count
				const currentCount = parseInt(fm['readCount']) || 0;
				fm['readCount'] = currentCount + 1;

				new Notice('Started reading!');
			}
			else if (action === 'finish') {
				fm['currentlyReading'] = false;
				fm['lastRead'] = today;
				fm['dateRead'] = today; // Also update dateRead to match

				new Notice('Finished reading!');
			}
			else if (action === 'dnf') {
				fm['currentlyReading'] = false;

				// Decrement read count since we're giving up
				const currentCount = parseInt(fm['readCount']) || 0;
				if (currentCount > 0) {
					fm['readCount'] = currentCount - 1;
				}

				new Notice('Marked as Didn\'t Finish.');
			}
		});

		// Buttons will automatically trigger a refresh because the file change triggers Obsidian events,
		// but we can manually invoke it to be safe and responsive:
		setTimeout(() => {
			this.updateActiveView(file);
		}, 100);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateShelfView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(SHELF_VIEW_TYPE);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf in the right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({ type: SHELF_VIEW_TYPE, active: true });
			}
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
