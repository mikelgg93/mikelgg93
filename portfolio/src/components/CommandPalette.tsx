import { Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { blocksPageShortcut, isTypingTarget } from "@/lib/keyboard";
import { type SearchEntry, searchEntries, searchSnippet } from "@/lib/search";
import "./command-palette.css";

type Result = {
	title: string;
	type: string;
	description: string;
	url?: string;
	run?: () => void;
};
let cachedIndex: SearchEntry[] | null = null;

export default function CommandPalette() {
	const id = useId();
	const dialog = useRef<HTMLDialogElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const opener = useRef<HTMLElement | null>(null);
	const [open, setOpen] = useState(false);
	const [help, setHelp] = useState(false);
	const [query, setQuery] = useState("");
	const [projects, setProjects] = useState(false);
	const [index, setIndex] = useState<SearchEntry[]>(cachedIndex ?? []);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [active, setActive] = useState(0);
	const [lang, setLang] = useState("en");
	const [article, setArticle] = useState(false);
	const show = useCallback((shortcuts = false) => {
		// Release the sidebar's focus trap and aria-hidden treatment first.
		if (document.querySelector('[data-mobile-menu][data-state="open"]')) {
			document.dispatchEvent(
				new CustomEvent("site:open-search", { detail: shortcuts }),
			);
			return;
		}
		if (!dialog.current?.open)
			opener.current = document.activeElement as HTMLElement | null;
		document.querySelectorAll<HTMLElement>(":popover-open").forEach((panel) => {
			panel.hidePopover();
		});
		setHelp(shortcuts);
		setQuery("");
		setProjects(false);
		setActive(0);
		setLang(document.documentElement.lang);
		setArticle(Boolean(document.querySelector("[data-article-body]")));
		dialog.current?.showModal();
		setOpen(true);
		input.current?.focus();
	}, []);
	const close = () => dialog.current?.close();
	useEffect(() => {
		const key = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.isComposing ||
				isTypingTarget(event.target)
			)
				return;
			if (
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey &&
				(event.key === "/" || event.key === "?")
			) {
				event.preventDefault();
				show(event.key === "?");
				return;
			}
			if (dialog.current?.open || blocksPageShortcut(event.target)) return;
			if (event.ctrlKey || event.metaKey) {
				const code = event.key.toLowerCase();
				if (code === "k") {
					event.preventDefault();
					const dark = !document.documentElement.classList.contains("dark");
					document.documentElement.classList.toggle("dark", dark);
					try {
						localStorage.setItem("theme", dark ? "dark" : "light");
					} catch {
						/* The current page can still change theme. */
					}
					document
						.getElementById("theme-color-meta")
						?.setAttribute("content", dark ? "#001e19" : "#f3eee3");
				} else if (code === "b" || code === "j") {
					event.preventDefault();
					const es = location.pathname.startsWith("/es");
					location.assign(
						code === "b"
							? es
								? "/es/blog/"
								: "/blog/"
							: es
								? location.pathname.replace(/^\/es/, "") || "/"
								: `/es${location.pathname}`,
					);
				}
			}
		};
		const trigger = (event: MouseEvent) => {
			if ((event.target as Element).closest("[data-open-search]")) show();
		};
		const afterMenu = (event: Event) =>
			show((event as CustomEvent<boolean>).detail);
		const beforeSwap = () => dialog.current?.close();
		document.addEventListener("site:search-ready", afterMenu);
		document.addEventListener("keydown", key);
		document.addEventListener("click", trigger);
		document.addEventListener("astro:before-swap", beforeSwap);
		return () => {
			document.removeEventListener("site:search-ready", afterMenu);
			document.removeEventListener("keydown", key);
			document.removeEventListener("click", trigger);
			document.removeEventListener("astro:before-swap", beforeSwap);
		};
	}, [show]);
	useEffect(() => {
		if (!open || cachedIndex) return;
		const controller = new AbortController();
		setLoading(true);
		setError(false);
		fetch("/search-index.json", { signal: controller.signal })
			.then((response) => {
				if (!response.ok) throw new Error("Search unavailable");
				return response.json() as Promise<SearchEntry[]>;
			})
			.then((entries) => {
				if (!controller.signal.aborted) {
					cachedIndex = entries;
					setIndex(entries);
				}
			})
			.catch(() => {
				if (!controller.signal.aborted) setError(true);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [open]);
	const home = lang === "es" ? "/es/" : "/";
	const actions: Result[] = [
		{
			title: "Go to homepage",
			type: "Navigate",
			description: "Portfolio",
			url: home,
		},
		{
			title: "Browse blog",
			type: "Navigate",
			description: "Published articles",
			url: `${home}blog/`,
		},
		{
			title: "View projects",
			type: "Navigate",
			description: "Interactive work",
			run: () => {
				setProjects(true);
				setQuery("");
				setActive(0);
			},
		},
		{
			title: "View publications",
			type: "Navigate",
			description: "Research",
			url: `${home}#publications`,
		},
		{
			title: "Open contact information",
			type: "Navigate",
			description: "Email and public profiles",
			url: `${home}#contact`,
		},
		{
			title: "Show keyboard shortcuts",
			type: "Help",
			description: "Available keys",
			run: () => {
				setHelp(true);
				setQuery("");
				setActive(0);
			},
		},
		...(article
			? [
					{
						title: "Back to article title",
						type: "Article action",
						description: "Start of this article",
						run: () => {
							close();
							document
								.querySelector("article")
								?.scrollIntoView({ behavior: "instant" });
						},
					},
				]
			: []),
	];
	const results: Result[] = help
		? []
		: query.trim() || projects
			? [
					...searchEntries(index, query, lang, projects).map((entry) => ({
						...entry,
						description: searchSnippet(entry, query),
					})),
					...(!projects
						? actions.filter((action) =>
								action.title.toLowerCase().includes(query.toLowerCase()),
							)
						: []),
				].slice(0, 14)
			: actions;
	const selected = Math.min(active, Math.max(0, results.length - 1));
	useEffect(() => {
		if (open)
			document
				.getElementById(`${id}-${selected}`)
				?.scrollIntoView({ block: "nearest" });
	}, [id, selected, open]);
	const activate = (result?: Result) => {
		if (!result) return;
		if (result.run) result.run();
		else if (result.url) {
			close();
			location.assign(result.url);
		}
	};
	return (
		<dialog
			ref={dialog}
			className="command-palette"
			aria-labelledby={`${id}-title`}
			onClose={() => {
				setOpen(false);
				opener.current?.isConnected &&
					opener.current.focus({ preventScroll: true });
			}}
			onClick={(event) => {
				if (event.target === dialog.current) close();
			}}
		>
			<div className="command-content">
				<div className="command-header">
					<Search size={18} aria-hidden="true" />
					<label id={`${id}-title`} className="sr-only" htmlFor={`${id}-input`}>
						Search and navigation
					</label>
					<input
						ref={input}
						id={`${id}-input`}
						type="search"
						role="combobox"
						aria-autocomplete="list"
						aria-expanded={open && !help}
						aria-controls={`${id}-results`}
						aria-activedescendant={
							!help && results.length ? `${id}-${selected}` : undefined
						}
						placeholder={
							help
								? "Search the site…"
								: projects
									? "Search projects…"
									: "Search or go to…"
						}
						autoComplete="off"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							setActive(0);
							setHelp(false);
						}}
						onKeyDown={(event) => {
							if (event.nativeEvent.isComposing) return;
							if (event.key === "ArrowDown" || event.key === "ArrowUp") {
								event.preventDefault();
								setActive(
									(selected +
										(event.key === "ArrowDown" ? 1 : -1) +
										results.length) %
										Math.max(1, results.length),
								);
							} else if (event.key === "Enter") {
								event.preventDefault();
								activate(results[selected]);
							}
						}}
					/>
					<button type="button" onClick={close} aria-label="Close search">
						<X size={18} aria-hidden="true" />
					</button>
				</div>
				{help ? (
					<div className="command-help">
						<h2>Keyboard shortcuts</h2>
						{[
							["Search", "/"],
							["Shortcut help", "?"],
							["Move through results", "↑ ↓"],
							["Open result", "Enter"],
							["Close", "Escape"],
							["Theme", "Ctrl/⌘ K"],
							["Language", "Ctrl/⌘ J"],
							["Blog", "Ctrl/⌘ B"],
							["Replay signature", "S"],
							...(article ? [["Previous / next article", "← →"]] : []),
						].map(([label, key]) => (
							<p key={label}>
								<span>{label}</span>
								<kbd>{key}</kbd>
							</p>
						))}
					</div>
				) : (
					<>
						<div
							id={`${id}-results`}
							role="listbox"
							aria-label="Search results"
							className="command-results"
						>
							{results.map((result, i) => (
								<div
									id={`${id}-${i}`}
									key={`${result.type}-${result.url ?? result.title}-${i}`}
									role="option"
									tabIndex={-1}
									aria-selected={selected === i}
									onPointerMove={() => setActive(i)}
									onClick={() => activate(result)}
								>
									<span className="command-type">{result.type}</span>
									<strong>{result.title}</strong>
									<p>{result.description}</p>
								</div>
							))}
						</div>
						<p className="command-status" role="status">
							{loading
								? "Loading search…"
								: error
									? "Search is unavailable. Navigation still works."
									: results.length
										? ""
										: "No results. Try a shorter phrase."}
						</p>
					</>
				)}
				<div className="command-footer">
					<span>
						<kbd>↑ ↓</kbd> choose · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close
					</span>
					<button
						type="button"
						onClick={() => {
							setHelp(!help);
							input.current?.focus();
						}}
					>
						?
					</button>
				</div>
			</div>
		</dialog>
	);
}
