import {
	HeadingCache,
	MarkdownView,
	Plugin,
	TFile,
} from 'obsidian';

const CLS = 'document-outline';

class OutlineComponent {
	private containerEl: HTMLElement;
	private linesEl: HTMLElement;
	private panelEl: HTMLElement;
	private headings: HeadingCache[] = [];
	private itemEls: HTMLElement[] = [];
	private lineEls: HTMLElement[] = [];
	private activeIndex = -1;

	constructor(private view: MarkdownView) {
		this.containerEl = view.contentEl.createDiv({ cls: CLS });
		this.linesEl = this.containerEl.createDiv({ cls: `${CLS}-lines` });
		this.panelEl = this.containerEl.createDiv({ cls: `${CLS}-panel` });

		// Keep the card open while tabbing through it, but not after a mouse click.
		this.containerEl.addEventListener('focusin', (evt) => {
			const target = evt.target as HTMLElement;
			this.containerEl.toggleClass(
				'is-keyboard-focus',
				target.matches(':focus-visible'),
			);
		});
		this.containerEl.addEventListener('focusout', () => {
			this.containerEl.removeClass('is-keyboard-focus');
		});
	}

	destroy() {
		this.containerEl.remove();
	}

	render(headings: HeadingCache[]) {
		this.headings = headings;
		this.linesEl.empty();
		this.panelEl.empty();
		this.itemEls = [];
		this.lineEls = [];
		this.activeIndex = -1;

		this.containerEl.toggleClass('is-empty', headings.length === 0);
		if (headings.length === 0) return;

		const minLevel = Math.min(...headings.map((h) => h.level));
		headings.forEach((heading, i) => {
			const depth = heading.level - minLevel;

			const line = this.linesEl.createDiv({ cls: `${CLS}-line` });
			line.setCssProps({ '--outline-depth': String(depth) });
			this.lineEls.push(line);

			const item = this.panelEl.createDiv({
				cls: `${CLS}-item`,
				text: heading.heading,
			});
			item.setCssProps({ '--outline-depth': String(depth) });
			item.setAttr('role', 'button');
			item.setAttr('tabindex', '0');
			item.addEventListener('click', () => {
				this.navigate(heading);
				item.blur();
			});
			item.addEventListener('keydown', (evt) => {
				if (evt.key === 'Enter' || evt.key === ' ') {
					evt.preventDefault();
					this.navigate(heading);
				}
			});
			this.itemEls.push(item);
		});
		this.updateActive();
	}

	private navigate(heading: HeadingCache) {
		const line = heading.position.start.line;
		this.view.setEphemeralState({ line, scroll: line });
	}

	/** Highlights the last heading at or above the top of the visible area. */
	updateActive() {
		if (this.headings.length === 0) return;
		const topLine = Math.floor(this.view.currentMode?.getScroll() ?? 0);
		let index = -1;
		this.headings.forEach((h, i) => {
			if (h.position.start.line <= topLine + 1) index = i;
		});
		if (index === this.activeIndex) return;
		this.itemEls[this.activeIndex]?.removeClass('is-active');
		this.lineEls[this.activeIndex]?.removeClass('is-active');
		this.itemEls[index]?.addClass('is-active');
		this.lineEls[index]?.addClass('is-active');
		this.activeIndex = index;
	}
}

export default class DocumentOutlinePlugin extends Plugin {
	private outlines = new WeakMap<MarkdownView, OutlineComponent>();
	private views = new Set<MarkdownView>();

	onload() {
		this.app.workspace.onLayoutReady(() => this.refreshAll());

		this.registerEvent(
			this.app.workspace.on('layout-change', () => this.refreshAll()),
		);
		this.registerEvent(
			this.app.workspace.on('file-open', () => this.refreshAll()),
		);
		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => this.refreshFile(file)),
		);

		this.registerDomEvent(
			activeDocument,
			'scroll',
			(evt: Event) => {
				for (const view of this.views) {
					if (view.contentEl.contains(evt.target as Node)) {
						this.outlines.get(view)?.updateActive();
					}
				}
			},
			true,
		);
	}

	onunload() {
		for (const view of this.views) this.outlines.get(view)?.destroy();
		this.views.clear();
	}

	private refreshAll() {
		const current = new Set<MarkdownView>();
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) current.add(leaf.view);
		});

		for (const view of this.views) {
			if (!current.has(view)) {
				this.outlines.get(view)?.destroy();
				this.outlines.delete(view);
				this.views.delete(view);
			}
		}
		for (const view of current) this.refreshView(view);
	}

	private refreshFile(file: TFile) {
		for (const view of this.views) {
			if (view.file?.path === file.path) this.refreshView(view);
		}
	}

	private refreshView(view: MarkdownView) {
		let outline = this.outlines.get(view);
		if (!outline || !view.contentEl.contains(view.contentEl.find(`.${CLS}`))) {
			outline?.destroy();
			outline = new OutlineComponent(view);
			this.outlines.set(view, outline);
		}
		this.views.add(view);

		const headings = view.file
			? (this.app.metadataCache.getFileCache(view.file)?.headings ?? [])
			: [];
		outline.render(headings);
	}
}
