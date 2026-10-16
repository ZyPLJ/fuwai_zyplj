<script lang="ts">
// 右侧栏「最新动态」卡片数据组件
// 数据源与 /moments/ 一致：Twikoo 后端 /moments/publish/ path 上站长(master)的评论即动态。
// 展示：置顶(top:true)的动态 + 最新一条非置顶动态；无置顶时只显示最新一条。
// 该组件位于 #right-sidebar（swup 容器之外，跨页常驻），配合 client:visible 首见才加载；
// 发布新动态后靠 astro:page-load 事件静默刷新（文章详情页 #right-sidebar 被隐藏，跳过）。
import Icon from "@iconify/svelte";
import { url } from "@utils/url-utils";
import { onMount } from "svelte";
import { commentConfig, momentsConfig } from "../../config";

const ENVID = commentConfig.twikoo.envId;
const PUBLISH_PATH = momentsConfig.publishPath; // 站长发动态的专用 path
const RAW_PAGE_LIMIT = 3; // 最多翻的原始页数（置顶较旧时也能找到）

interface Moment {
	id: string;
	comment: string; // HTML
	top: boolean;
	created: number;
}

let loading = true;
let error = "";
let pinned: Moment | null = null; // 置顶动态
let latest: Moment | null = null; // 最新一条非置顶动态
let fetching = false; // 防止 astro:page-load 连续触发时请求并发交错

async function fetchMoments() {
	if (fetching) return;
	fetching = true;
	try {
		const masters: Moment[] = [];
		let before: number | null = null;
		for (let i = 0; i < RAW_PAGE_LIMIT; i++) {
			const body: Record<string, unknown> = { url: PUBLISH_PATH };
			if (before != null) body.before = before;
			const res = await fetch(ENVID, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ event: "COMMENT_GET", ...body }),
			});
			if (!res.ok) throw new Error(`Twikoo COMMENT_GET HTTP ${res.status}`);
			const data = await res.json();
			const raw: Moment[] = Array.isArray(data?.data) ? data.data : [];
			for (const c of raw) {
				if (c.master === true) masters.push(c);
			}
			if (data?.more !== true || raw.length === 0) break;
			before = raw[raw.length - 1].created;
		}
		const pinnedItem = masters.find((m) => m.top === true) ?? null;
		const sorted = masters
			.filter((m) => m.id !== pinnedItem?.id)
			.sort((a, b) => b.created - a.created);
		pinned = pinnedItem;
		latest = sorted[0] ?? null;
		error = "";
	} catch (err) {
		error = err instanceof Error ? err.message : "加载失败";
		console.error("Failed to load latest dynamics:", err);
	} finally {
		loading = false;
		fetching = false;
	}
}

// 正文 HTML → 纯文本摘要
function stripHtml(html: string): string {
	const div = document.createElement("div");
	div.innerHTML = html;
	return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

// 紧凑时间格式：2026/09/04 15:04
function fmtTime(created: number): string {
	const d = new Date(created);
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 是否应在当前页面显示（文章详情页右栏隐藏时不刷新，节省请求）
function sidebarVisible(): boolean {
	return !document.body.classList.contains("is-posts-route");
}

onMount(() => {
	fetchMoments();
	// 切页后静默刷新（如站长在 /moments/ 发布新动态后切回首页）
	document.addEventListener("astro:page-load", () => {
		if (sidebarVisible()) fetchMoments();
	});
});
</script>

<div class="flex flex-col gap-1.5 py-1">
	{#if loading}
		<div class="animate-pulse flex flex-col gap-2 p-2">
			<div class="h-4 bg-black/10 dark:bg-white/10 rounded w-3/4"></div>
			<div class="h-4 bg-black/5 dark:bg-white/5 rounded w-1/2"></div>
		</div>
	{:else if error && !pinned && !latest}
		<button
			class="w-full text-left p-2 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:text-[var(--primary)] transition-colors"
			on:click={() => {
				loading = true;
				error = "";
				fetchMoments();
			}}
		>
			动态加载失败，点击重试
		</button>
	{:else if !pinned && !latest}
		<p class="p-2 text-sm text-neutral-500 dark:text-neutral-400">暂无动态</p>
	{:else}
		{#each [pinned, latest].filter(Boolean) as m (m.id)}
			<a
				class="group flex min-w-0 min-h-16 items-start gap-2.5 rounded-lg p-2
					text-neutral-700/75 dark:text-neutral-300/75
					hover:bg-[var(--btn-plain-bg-hover)] hover:text-[var(--primary)]
					active:bg-[var(--btn-plain-bg-active)] transition-colors duration-150"
				href={url(`/moments/#m-${m.id}`)}
				aria-label={`动态: ${stripHtml(m.comment).slice(0, 50)}`}
			>
				<div class="min-w-0 flex-1">
					<div class="mb-1 flex items-center gap-1.5 text-xs leading-4 text-[var(--primary)]">
						<Icon icon="material-symbols:schedule-outline-rounded" class="size-3.5 shrink-0" />
						<time datetime={new Date(m.created).toISOString()}>
							{fmtTime(m.created)}
						</time>
						{#if m.top}
							<span
								class="ml-auto inline-flex items-center gap-0.5 rounded bg-[var(--btn-plain-bg-hover)] px-1 py-0.5 text-[10px] font-medium text-[var(--primary)]"
							>
								<Icon icon="material-symbols:push-pin" class="size-3" />
								置顶
							</span>
						{/if}
					</div>
					<p class="m-0 line-clamp-2 text-sm leading-[1.35rem] break-words">
						{stripHtml(m.comment)}
					</p>
				</div>
			</a>
		{/each}
		<a
			class="btn-plain mt-1 flex items-center justify-center gap-1 rounded-lg p-1.5 text-sm text-[var(--primary)]"
			href={url("/moments/")}
		>
			<Icon icon="material-symbols:dynamic-feed-rounded" class="size-[1.125rem]" />
			<span>更多动态</span>
		</a>
	{/if}
</div>
