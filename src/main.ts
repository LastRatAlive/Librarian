import { App, MarkdownView, Plugin, TFile, Notice, WorkspaceLeaf } from 'obsidian';
import { LibrarianSettings, DEFAULT_SETTINGS, LibrarianSettingTab } from './settings';
import { BookSearchModal } from './BookSearchModal';
import { ShelfView, SHELF_VIEW_TYPE } from './ShelfView';
import { StatsView, STATS_VIEW_TYPE } from './StatsView';
import { ShelfSelectionModal } from './ShelfSelectionModal';
import { DateQueryModal } from './DateQueryModal';
import { getBooksActiveOnDate } from './BookUtils';
import { QuoteModal } from './QuoteModal';

export default class LibrarianPlugin extends Plugin {
	settings: LibrarianSettings;

	async onload() {
		console.log('Loading Librarian plugin');
		await this.loadSettings();

		this.registerView(
			SHELF_VIEW_TYPE,
			(leaf) => new ShelfView(leaf, this)
		);

		this.registerView(
			STATS_VIEW_TYPE,
			(leaf) => new StatsView(leaf, this)
		);

		// Check when a file is opened
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.updateAllViews();
			})
		);

		// Also check when metadata finishes processing (fixes new book creation delay)
		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				this.updateAllViews();
			})
		);

		// Also check the currently active file on load + init views
		this.app.workspace.onLayoutReady(() => {
			this.updateAllViews();

			// Auto-initialize sidebar views if they don't exist yet
			this.activateShelfView();
		});

		// Add Ribbon Icons
		if (this.settings.showShelfRibbon) {
			this.addRibbonIcon('library', 'Open Bookshelves', () => {
				this.activateShelfView();
			});
		}

		if (this.settings.showStatsRibbon) {
			this.addRibbonIcon('bar-chart', 'Open Reading Stats', () => {
				this.activateStatsView();
			});
		}

		// Register Code Block Processor
		this.registerMarkdownCodeBlockProcessor("librarian", (source, el, ctx) => {
			const rows = source.split("\n").filter((row) => row.length > 0);
			const options: any = {};

			for (const row of rows) {
				const [key, ...valueParts] = row.split(":");
				if (key && valueParts.length > 0) {
					options[key.trim()] = valueParts.join(":").trim();
				}
			}

			if (options.tag) {
				this.renderTaggedQuotes(el, options.tag, options);
				return;
			}

			let dateStr = options.date || "";
			if (!dateStr || dateStr === 'today') {
				dateStr = new Date().toISOString().split('T')[0] ?? "";
			}

			const books = getBooksActiveOnDate(this.app, dateStr);
			const container = el.createDiv({ cls: 'librarian-block-container' });

			if (options.hideHeader !== 'true') {
				container.createEl('h4', { text: `Reading List for ${dateStr}`, cls: 'librarian-block-title' });
			}

			if (books.length === 0) {
				container.createEl('p', { text: `No books active on ${dateStr}`, cls: 'librarian-block-empty' });
			} else {
				const ul = container.createEl('ul', { cls: 'librarian-block-list' });

				let booksToDisplay = books;
				if (options.limit) {
					const limit = parseInt(options.limit);
					if (!isNaN(limit)) booksToDisplay = books.slice(0, limit);
				}

				for (const file of booksToDisplay) {
					const li = ul.createEl('li');
					const link = li.createEl('a', { text: file.basename, cls: 'internal-link' });
					link.onclick = (e) => {
						this.app.workspace.getLeaf(e.ctrlKey || e.metaKey).openFile(file);
					};
				}
			}
		});

		this.addCommand({
			id: 'open-shelves',
			name: 'Open Bookshelves',
			callback: () => {
				this.activateShelfView();
			}
		});

		this.addCommand({
			id: 'open-stats',
			name: 'Open Reading Stats',
			callback: () => {
				this.activateStatsView();
			}
		});

		// Add settings tab
		this.addSettingTab(new LibrarianSettingTab(this.app, this));

		// Search and Add Book Command
		this.addCommand({
			id: 'add-book',
			name: 'Add Book (Search Open Library)',
			callback: () => {
				new BookSearchModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'query-date',
			name: 'What was I reading? (Search by Date)',
			callback: () => {
				new DateQueryModal(this.app, this).open();
			}
		});

		// Fallback commands for users who prefer Command Palette
		this.addCommand({
			id: 'start-reading',
			name: 'Start Reading (Update Frontmatter)',
			checkCallback: (checking: boolean) => this.runCommand(checking, 'start')
		});

		this.addCommand({
			id: 'finish-reading',
			name: 'Finish Reading (Update Frontmatter)',
			checkCallback: (checking: boolean) => this.runCommand(checking, 'finish')
		});

		this.addCommand({
			id: 'dnf',
			name: 'Didn\'t Finish Reading (Update Frontmatter)',
			checkCallback: (checking: boolean) => this.runCommand(checking, 'dnf')
		});
	}

	onunload() {
		console.log('Unloading Librarian plugin');
		// Remove from all views when unloading
		document.querySelectorAll('.librarian-button-container').forEach(el => el.remove());
	}

	private updateAllViews() {
		const leaves = this.app.workspace.getLeavesOfType('markdown');
		for (const leaf of leaves) {
			const view = leaf.view as MarkdownView;
			if (view && view.file) {
				this.updateViewButtons(view, view.file);
			}
		}
	}

	private updateViewButtons(view: MarkdownView, file: TFile) {
		const container = view.containerEl.querySelector('.view-header');
		if (!container) return;

		// Clear old buttons for this specific view
		container.querySelectorAll('.librarian-button-container').forEach(el => el.remove());

		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		// Only show on books
		if (frontmatter?.['type'] === 'book') {
			this.injectButtonsIntoContainer(container, file, frontmatter);
		}
	}

	private injectButtonsIntoContainer(container: Element, file: TFile, frontmatter: any) {
		if (!this.settings.showNoteButtons) return;
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

		// Shelf Management Button
		const shelfBtn = buttonContainer.createEl('button', { text: 'Shelf +' });
		shelfBtn.onclick = () => new ShelfSelectionModal(this.app, this, file).open();

		// Add Quote Button
		const quoteBtn = buttonContainer.createEl('button', { text: '💬 Add Quote' });
		quoteBtn.onclick = () => new QuoteModal(this.app, this, file).open();
	}

	private async renderTaggedQuotes(el: HTMLElement, tag: string, options: any = {}) {
		const container = el.createDiv({ cls: 'librarian-block-container' });

		if (options.hideHeader !== 'true') {
			container.createEl('h4', { text: `Quotes tagged with ${tag}`, cls: 'librarian-block-title' });
		}

		const allFiles = this.app.vault.getMarkdownFiles();
		const matches: { quote: string, file: TFile, blockId: string }[] = [];

		for (const file of allFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.['type'] !== 'book') continue;

			const content = await this.app.vault.read(file);
			const lines = content.split('\n');

			for (const line of lines) {
				if (line.includes(tag) && line.includes('^quote-')) {
					// Found a tagged quote line
					const quoteMatch = line.match(/^>\s*"(.*)"\s*.*?\^quote-(.*)$/);
					if (quoteMatch && quoteMatch[1] && quoteMatch[2]) {
						matches.push({
							quote: quoteMatch[1],
							file: file,
							blockId: `quote-${quoteMatch[2]}`
						});
					} else {
						// Fallback if regex is too strict
						const parts = line.split('^quote-');
						const cleanQuote = parts[0]?.replace(/^>\s*/, '').trim() || "";
						const blockIdPart = parts[1]?.trim() || "";
						if (cleanQuote && blockIdPart) {
							matches.push({ quote: cleanQuote, file: file, blockId: `quote-${blockIdPart}` });
						}
					}
				}
			}
		}

		if (matches.length === 0) {
			container.createEl('p', { text: `No quotes found with tag ${tag}`, cls: 'librarian-block-empty' });
		} else {
			let displayedMatches = matches;
			if (options.limit) {
				const limit = parseInt(options.limit);
				if (!isNaN(limit)) displayedMatches = matches.slice(0, limit);
			}

			for (const match of displayedMatches) {
				const quoteEl = container.createEl('blockquote', { cls: 'librarian-block-quote' });
				quoteEl.createEl('p', { text: match.quote });

				const sourceEl = container.createEl('div', { cls: 'librarian-quote-source' });
				sourceEl.style.textAlign = 'right';
				sourceEl.style.fontSize = '0.8em';
				sourceEl.style.marginTop = '-10px';
				sourceEl.style.marginBottom = '20px';

				const link = sourceEl.createEl('a', { text: `— ${match.file.basename}`, cls: 'internal-link' });
				link.onclick = (e) => {
					this.app.workspace.getLeaf(e.ctrlKey || e.metaKey).openFile(match.file);
				};
			}
		}
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

				// Initialize readHistory if missing
				if (!fm['readHistory']) {
					fm['readHistory'] = [];
				}

				// Create a new session entry
				fm['readHistory'].push({ start: today, end: "" });

				new Notice('Started reading!');
			}
			else if (action === 'finish') {
				fm['currentlyReading'] = false;
				fm['lastRead'] = today;
				fm['dateRead'] = today; // Also update dateRead to match

				// Update the latest readHistory session if it exists and lacks an end date
				if (fm['readHistory'] && Array.isArray(fm['readHistory']) && fm['readHistory'].length > 0) {
					const lastSession = fm['readHistory'][fm['readHistory'].length - 1];
					if (lastSession && !lastSession.end) {
						lastSession.end = today;
					}
				} else {
					// Edge case: Finished reading but no start session was recorded
					if (!fm['readHistory']) fm['readHistory'] = [];
					fm['readHistory'].push({ start: "", end: today });
				}

				new Notice('Finished reading!');
			}
			else if (action === 'dnf') {
				fm['currentlyReading'] = false;

				// Decrement read count since we're giving up
				const currentCount = parseInt(fm['readCount']) || 0;
				if (currentCount > 0) {
					fm['readCount'] = currentCount - 1;
				}

				// Optionally remove or close the latest readHistory session for a DNF
				if (fm['readHistory'] && Array.isArray(fm['readHistory']) && fm['readHistory'].length > 0) {
					const lastSession = fm['readHistory'][fm['readHistory'].length - 1];
					if (lastSession && !lastSession.end) {
						lastSession.end = "DNF";
					}
				}

				new Notice('Marked as Didn\'t Finish.');
			}
		});

		// Wait for metadata cache to update automatically, but we can also manually trigger visual refresh:
		setTimeout(() => {
			this.updateAllViews();
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
			leaf = leaves[0] as WorkspaceLeaf | null;
		} else {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf as WorkspaceLeaf | null;
				if (leaf) {
					await leaf.setViewState({ type: SHELF_VIEW_TYPE, active: true });
				}
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async activateStatsView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(STATS_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0] as WorkspaceLeaf | null;
		} else {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf as WorkspaceLeaf | null;
				if (leaf) {
					await leaf.setViewState({ type: STATS_VIEW_TYPE, active: true });
				}
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
