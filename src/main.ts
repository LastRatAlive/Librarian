import { MarkdownView, Plugin, TFile, Notice, WorkspaceLeaf, Platform } from 'obsidian';
import { LibrarianSettings, DEFAULT_SETTINGS, LibrarianSettingTab } from './settings';
import { BookSearchModal } from './BookSearchModal';
import { ShelfView, SHELF_VIEW_TYPE } from './ShelfView';
import { StatsView, STATS_VIEW_TYPE } from './StatsView';
import { ShelfSelectionModal } from './ShelfSelectionModal';
import { DateQueryModal } from './DateQueryModal';
import { getBooksActiveOnDate } from './BookUtils';
import { QuoteModal } from './QuoteModal';

interface BookFrontmatter {
	type?: string;
	title?: string;
	author?: string;
	readCount?: number | string;
	readHistory?: { start: string, end: string }[];
	currentlyReading?: boolean | string;
	pages?: number | string;
	shelf?: string | string[];
	[key: string]: string | number | boolean | unknown[] | Record<string, unknown> | undefined;
}

export default class LibrarianPlugin extends Plugin {
	settings: LibrarianSettings;

	async onload() {
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
			void this.activateShelfView();
		});

		// Add Ribbon Icons
		if (this.settings.showAddBookRibbon) {
			this.addRibbonIcon('plus-with-circle', 'Add book', () => {
				new BookSearchModal(this.app, this).open();
			});
		}

		if (this.settings.showShelfRibbon) {
			this.addRibbonIcon('library', 'Open bookshelves', () => {
				void this.activateShelfView();
			});
		}

		if (this.settings.showStatsRibbon) {
			this.addRibbonIcon('bar-chart', 'Open reading stats', () => {
				void this.activateStatsView();
			});
		}

		// Register Code Block Processor
		this.registerMarkdownCodeBlockProcessor("librarian", (source, el, ctx) => {
			const rows = source.split("\n").filter((row) => row.length > 0);
			const options: Record<string, string> = {};

			for (const row of rows) {
				const [key, ...valueParts] = row.split(":");
				if (key && valueParts.length > 0) {
					options[key.trim()] = valueParts.join(":").trim();
				}
			}

			if (options.tag) {
				void this.renderTaggedQuotes(el, options.tag, options);
				return;
			}

			let dateStr = options.date || "";
			if (!dateStr || dateStr === 'today') {
				dateStr = new Date().toISOString().split('T')[0] ?? "";
			}

			const books = getBooksActiveOnDate(this.app, dateStr);
			const container = el.createDiv({ cls: 'librarian-block-container' });

			if (options.hideHeader !== 'true') {
				container.createEl('div', { text: `Reading list for ${dateStr}`, cls: 'librarian-block-title librarian-view-header' });
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

				for (const book of booksToDisplay) {
					const li = ul.createEl('li');
					const link = li.createEl('a', { text: book.basename, cls: 'internal-link' });
					link.onclick = (e) => {
						void this.app.workspace.getLeaf(e.ctrlKey || e.metaKey).openFile(book);
					};
				}
			}
		});

		this.addCommand({
			id: 'open-shelves',
			name: 'Show bookshelves',
			callback: () => {
				void this.activateShelfView();
			}
		});

		this.addCommand({
			id: 'open-stats',
			name: 'Show reading stats',
			callback: () => {
				void this.activateStatsView();
			}
		});

		// Add settings tab
		this.addSettingTab(new LibrarianSettingTab(this.app, this));

		// Search and Add Book Command
		this.addCommand({
			id: 'add-book',
			name: 'Add book (search open library)',
			callback: () => {
				new BookSearchModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'query-date',
			name: 'Search reading history by date',
			callback: () => {
				new DateQueryModal(this.app, this).open();
			}
		});

		// Fallback commands for users who prefer Command Palette
		this.addCommand({
			id: 'start-reading',
			name: 'Start reading (update frontmatter)',
			checkCallback: (checking: boolean) => this.runCommand(checking, 'start')
		});

		this.addCommand({
			id: 'finish-reading',
			name: 'Finish reading (update frontmatter)',
			checkCallback: (checking: boolean) => this.runCommand(checking, 'finish')
		});

		this.addCommand({
			id: 'dnf',
			name: 'Didn\'t finish reading (update frontmatter)',
			checkCallback: (checking: boolean) => this.runCommand(checking, 'dnf')
		});
	}

	onunload() {
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
		const frontmatter = cache?.frontmatter as BookFrontmatter | undefined;

		// Only show on books
		if (frontmatter?.['type'] === 'book') {
			this.injectButtonsIntoContainer(container, file, frontmatter);
		}
	}

	private injectButtonsIntoContainer(container: Element, file: TFile, frontmatter: BookFrontmatter) {
		if (!this.settings.showNoteButtons) return;
		// Create our button container in the header
		const buttonContainer = container.createEl('div', { cls: 'librarian-button-container' });

		const currentlyReading = frontmatter['currentlyReading'] === true || frontmatter['currentlyReading'] === 'true';

		if (!currentlyReading) {
			const startBtn = buttonContainer.createEl('button', {
				text: Platform.isMobile ? '▶' : 'Start reading',
				cls: 'librarian-btn librarian-start-btn'
			});
			if (Platform.isMobile) startBtn.setAttribute('aria-label', 'Start reading');
			startBtn.onclick = () => void this.runCommand(false, 'start');
		}
		else {
			const finishBtn = buttonContainer.createEl('button', {
				text: Platform.isMobile ? '✔' : 'Finished',
				cls: 'librarian-btn librarian-finish-btn'
			});
			if (Platform.isMobile) finishBtn.setAttribute('aria-label', 'Finished reading');
			finishBtn.onclick = () => void this.runCommand(false, 'finish');
			const dnfBtn = buttonContainer.createEl('button', {
				text: Platform.isMobile ? '✖' : 'Didn\'t finish',
				cls: 'librarian-btn librarian-dnf-btn'
			});
			if (Platform.isMobile) dnfBtn.setAttribute('aria-label', 'Didn\'t finish reading');
			dnfBtn.onclick = () => void this.runCommand(false, 'dnf');
		}

		const shelfBtn = buttonContainer.createEl('button', {
			text: Platform.isMobile ? '📚' : 'Add to shelf',
			cls: 'librarian-btn librarian-shelf-btn'
		});
		if (Platform.isMobile) shelfBtn.setAttribute('aria-label', 'Add to shelf');
		shelfBtn.onclick = () => {
			new ShelfSelectionModal(this.app, this, file).open();
		};

		const quoteBtn = buttonContainer.createEl('button', {
			text: Platform.isMobile ? '❝' : 'Add quote',
			cls: 'librarian-btn librarian-quote-btn'
		});
		if (Platform.isMobile) quoteBtn.setAttribute('aria-label', 'Add quote');
		quoteBtn.onclick = () => {
			new QuoteModal(this.app, this, file).open();
		};
	}

	private async renderTaggedQuotes(el: HTMLElement, tag: string, options: Record<string, string>) {
		const filesWithTag: TFile[] = [];
		const allFiles = this.app.vault.getMarkdownFiles();

		for (const file of allFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.['type'] === 'book') {
				const content = await this.app.vault.read(file);
				if (content.includes(`tag: ${tag}`) || content.includes(`#${tag}`)) {
					filesWithTag.push(file);
				}
			}
		}

		if (filesWithTag.length === 0) {
			el.createEl('p', { text: `No quotes found for tag: ${tag}` });
			return;
		}

		const container = el.createDiv({ cls: 'librarian-quotes-container' });
		if (options.hideHeader !== 'true') {
			container.createEl('div', { text: `Quotes tagged: ${tag}`, cls: 'librarian-block-title librarian-view-header' });
		}

		const fragment = document.createDocumentFragment();
		for (const file of filesWithTag) {
			const content = await this.app.vault.read(file);
			const quoteLines = content.split("\n").filter(line => line.startsWith(">") && (line.includes(`tag: ${tag}`) || line.includes(`#${tag}`)));

			for (const quote of quoteLines) {
				const quoteEl = fragment.createEl('blockquote', { cls: 'librarian-tag-quote' });
				quoteEl.setText(quote.replace(/^>\s*/, '').replace(/tag:.*|#\S+/g, '').trim());
				const source = fragment.createEl('p', { cls: 'librarian-quote-source' });
				const link = source.createEl('a', { text: `- ${file.basename}`, cls: 'internal-link' });
				link.onclick = (e) => {
					void this.app.workspace.getLeaf(e.ctrlKey || e.metaKey).openFile(file);
				};
			}
		}
		container.appendChild(fragment);
	}

	private runCommand(checking: boolean, action: 'start' | 'finish' | 'dnf'): boolean {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view || !view.file) return false;

		const cache = this.app.metadataCache.getFileCache(view.file);
		if (cache?.frontmatter?.['type'] !== 'book') return false;

		if (checking) return true;

		void this.performAction(view.file, action);
		return true;
	}

	private async performAction(file: TFile, action: 'start' | 'finish' | 'dnf') {
		const today = new Date().toISOString().split('T')[0] ?? "";

		await this.app.fileManager.processFrontMatter(file, (fm: BookFrontmatter) => {
			if (action === 'start') {
				fm['currentlyReading'] = true;
				if (!fm['readHistory']) fm['readHistory'] = [];
				fm['readHistory'].push({ start: today, end: "" });
				const currentCount = parseInt(fm['readCount']?.toString() || '0') || 0;
				fm['readCount'] = currentCount + 1;
				new Notice('Started reading!');
			}
			else if (action === 'finish') {
				fm['currentlyReading'] = false;
				fm['dateRead'] = today;


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

				new Notice('Finished reading');
			}
			else if (action === 'dnf') {
				fm['currentlyReading'] = false;

				// Decrement read count since we're giving up
				const currentCount = parseInt(fm['readCount']?.toString() || '0') || 0;
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

				new Notice('Marked as didn\'t finish');
			}
		});

		// Wait for metadata cache to update automatically, but we can also manually trigger visual refresh:
		window.setTimeout(() => {
			this.updateAllViews();
		}, 100);
	}

	async loadSettings() {
		const data = await this.loadData() as Record<string, unknown> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateShelfView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(SHELF_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0] as WorkspaceLeaf;
		} else {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				if (leaf) {
					await leaf.setViewState({ type: SHELF_VIEW_TYPE, active: true });
				}
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}

	async activateStatsView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(STATS_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0] as WorkspaceLeaf;
		} else {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				if (leaf) {
					await leaf.setViewState({ type: STATS_VIEW_TYPE, active: true });
				}
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}
}
