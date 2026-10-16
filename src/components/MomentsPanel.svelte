<script lang="ts">
import Icon from "@iconify/svelte";
import { formatDateI18n } from "@utils/date-utils";
import { onDestroy, onMount, tick } from "svelte";
import { commentConfig, momentsConfig, profileConfig } from "../config";

// 站长头像，由 moments.astro 编译期导入后传入
export let avatar = "";

// Twikoo 配置
const ENVID = commentConfig.twikoo.envId;
const PUBLISH_PATH = momentsConfig.publishPath; // 站长发动态的专用 path
const PAGE_SIZE = momentsConfig.pageSize ?? 10;
const RAW_PAGE_LOOP_LIMIT = 10; // 单批最多翻的原始页数（防垃圾评论稀释时死循环）
const TWIKOO_CDN =
	"https://registry.npmmirror.com/twikoo/1.7.20/files/dist/twikoo.min.js";

// Twikoo COMMENT_GET 返回的评论结构（实测）
interface TwikooComment {
	id: string;
	nick: string;
	mailMd5: string;
	link: string;
	comment: string; // HTML 字符串
	os: string;
	browser: string;
	ipRegion: string;
	master: boolean; // 是否站长
	like: number;
	liked: boolean;
	replies: unknown[];
	ruser: unknown;
	created: number; // 毫秒时间戳
	updated: number;
}

// 组件状态
let loading = true;
let loadingMore = false;
let error = "";
let moments: TwikooComment[] = []; // 过滤后（master===true）的动态
let hasMore = false; // 原始评论流是否还有更多
let cursor: number | null = null; // before 游标 = 原始流最旧一条的 created
let counts: Record<string, number> = {}; // 动态 id → 评论数
let activePanel: string | null = null; // 当前激活面板：null | "publish" | 动态 id（twikoo 1.7 全局单实例，同时只能存在一个）
let isAdmin = false;
let highlightId = "";
let refreshTimer: ReturnType<typeof setTimeout>;

// 加载 twikoo.min.js（与全局 twikoo-loader.js 的 window.twikooLoading/twikooLoaded 协作，防重复注入）
let twikooPromise: Promise<any> | null = null;
function loadTwikoo(): Promise<any> {
	const w = window as any;
	if (w.twikoo) return Promise.resolve(w.twikoo);
	if (twikooPromise) return twikooPromise;
	twikooPromise = new Promise((resolve, reject) => {
		const started = Date.now();
		const timer = setInterval(() => {
			if (w.twikoo) {
				clearInterval(timer);
				resolve(w.twikoo);
				return;
			}
			// 全局 loader 正在加载或页面已有 script 标签时等待，否则自己注入一份
			if (
				!w.twikooLoading &&
				!document.querySelector('script[src*="twikoo.min.js"]')
			) {
				w.twikooLoading = true;
				const s = document.createElement("script");
				s.src = TWIKOO_CDN;
				s.onload = () => {
					w.twikooLoaded = true;
				};
				s.onerror = () => {
					clearInterval(timer);
					twikooPromise = null;
					reject(new Error("twikoo.js 加载失败"));
				};
				document.head.appendChild(s);
			}
			if (Date.now() - started > 15000) {
				clearInterval(timer);
				twikooPromise = null;
				reject(new Error("twikoo.js 加载超时"));
			}
		}, 150);
	});
	return twikooPromise;
}

// Twikoo 后端 HTTP API 封装
async function twikooApi(event: string, extra: Record<string, unknown> = {}) {
	const res = await fetch(ENVID, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ event, ...extra }),
	});
	if (!res.ok) throw new Error(`Twikoo ${event} HTTP ${res.status}`);
	return res.json();
}

function dedupeById(list: TwikooComment[]): TwikooComment[] {
	const seen = new Set<string>();
	return list.filter((m) => {
		if (seen.has(m.id)) return false;
		seen.add(m.id);
		return true;
	});
}

// 拉取一批动态：before 游标作用于含垃圾评论的原始流，凑满 PAGE_SIZE 条站主动态为止
// 追加模式（append=true）下 batch 自带已展示的旧动态，条件是「新增」满 PAGE_SIZE——
// 否则首屏 ≥10 条时循环一次都不执行，点加载更多永远空转（hasMore/cursor 不变，按钮形同虚设）
async function fetchMomentsBatch(before: number | null, append: boolean) {
	const batch: TwikooComment[] = append ? [...moments] : [];
	const baseCount = batch.length;
	let more = true;
	let rawBefore = before;
	let loops = 0;
	while (
		batch.length - baseCount < PAGE_SIZE &&
		more &&
		loops < RAW_PAGE_LOOP_LIMIT
	) {
		loops++;
		const body: Record<string, unknown> = { url: PUBLISH_PATH };
		if (rawBefore != null) body.before = rawBefore;
		const data = await twikooApi("COMMENT_GET", body);
		const raw: TwikooComment[] = Array.isArray(data?.data) ? data.data : [];
		for (const c of raw) {
			if (c.master === true) batch.push(c);
		}
		more = data?.more === true;
		if (raw.length === 0) break;
		rawBefore = raw[raw.length - 1].created;
	}
	moments = dedupeById(batch);
	hasMore = more;
	cursor = rawBefore;
}

// 批量获取每条动态的评论数（官方 SDK）
async function fetchCounts() {
	if (moments.length === 0) return;
	try {
		const twikoo = await loadTwikoo();
		const urls = moments.map((m) => `/moments/#m-${m.id}`);
		const res = await twikoo.getCommentsCount({
			envId: ENVID,
			region: commentConfig.twikoo.region,
			urls,
			includeReply: true,
		});
		const next = { ...counts };
		for (const item of res ?? []) {
			const match = /#m-(.+)$/.exec(item.url);
			if (match) next[match[1]] = item.count;
		}
		counts = next;
	} catch {
		// 计数失败不影响列表
	}
}

async function loadMoments(showSkeleton = true) {
	if (showSkeleton) loading = true;
	error = "";
	try {
		cursor = null;
		hasMore = false;
		await fetchMomentsBatch(null, false);
		await fetchCounts();
	} catch (err) {
		error = err instanceof Error ? err.message : "动态加载失败";
		console.error("Failed to load moments:", err);
	} finally {
		loading = false;
	}
}

async function loadMore() {
	if (loadingMore || !hasMore || cursor == null) return;
	loadingMore = true;
	try {
		await fetchMomentsBatch(cursor, true);
		await fetchCounts();
	} catch {
		error = "加载更多失败";
	} finally {
		loadingMore = false;
	}
}

// 站长发布成功后刷新列表（防抖，避免连发抖动）
function refreshMoments() {
	clearTimeout(refreshTimer);
	refreshTimer = setTimeout(() => {
		loadMoments(false).then(() => {
			(window as any).createPhotoSwipe?.();
		});
	}, 800);
}

// 检测 Twikoo 管理员登录态（token 由评论区管理面板登录后写入 localStorage）
async function checkAdmin() {
	try {
		const token = localStorage.getItem("twikoo-access-token");
		if (!token) {
			isAdmin = false;
			return;
		}
		const data = await twikooApi("GET_CONFIG", { accessToken: token });
		isAdmin = data?.config?.IS_ADMIN === true;
		if (isAdmin) {
			activePanel = "publish"; // 站长默认展开发布框
		}
	} catch {
		isAdmin = false;
	}
}

// 统一面板挂载。twikoo 1.7 的 $mount(el) 会「替换」容器节点（替换后的 DOM 不再归 Svelte 管），
// 且 path 挂在全局原型上（最后初始化的组件对全局生效），因此：
//   ① Svelte 只持有外层 wrapper（不会被 twikoo 替换），显隐用 wrapper 的 display:none 切换；
//   ② 每次面板激活都清空 wrapper 内部并全新 init，保证全局 path 指向当前操作的面板；
//   ③ 内层节点用自增唯一 id，加载完成的异步回调通过 isConnected 防止过期实例污染。
let panelSeq = 0;
function panelMount(node: HTMLElement, param: { id: string; active: boolean }) {
	let mounted = false;
	const apply = (p: { id: string; active: boolean }) => {
		if (!p.active) {
			if (mounted) {
				node.innerHTML = "";
				mounted = false;
			}
			return;
		}
		if (mounted) return;
		mounted = true;
		node.innerHTML = "";
		const inner = document.createElement("div");
		inner.id = `twikoo-panel-${++panelSeq}`;
		node.appendChild(inner);
		const isPublish = p.id === "publish";
		const path = isPublish ? PUBLISH_PATH : `/moments/#m-${p.id}`;
		(async () => {
			try {
				const twikoo = await loadTwikoo();
				if (!inner.isConnected) return; // 面板已切换，过期实例作废
				twikoo.init({
					envId: ENVID,
					el: `#${inner.id}`,
					region: commentConfig.twikoo.region,
					path,
					lang: commentConfig.twikoo.lang,
					onCommentLoaded: () => {
						if (isPublish) {
							refreshMoments();
						} else {
							fetchCounts();
						}
						(window as any).createPhotoSwipe?.();
					},
				});
			} catch (e) {
				console.error("评论面板初始化失败", e);
			}
		})();
	};
	apply(param);
	return {
		update: apply,
		destroy() {
			node.innerHTML = "";
		},
	};
}

// hash 深链定位：/moments/#m-<id> → 展开评论区、滚动、高亮
async function handleHash(attempt = 0) {
	const hash = window.location.hash;
	if (!hash.startsWith("#m-")) return;
	const id = hash.slice(3);
	if (moments.some((m) => m.id === id)) {
		activePanel = id;
		await tick();
		document
			.getElementById(`moment-${id}`)
			?.scrollIntoView({ behavior: "smooth", block: "start" });
		highlightId = id;
		setTimeout(() => {
			highlightId = "";
		}, 3000);
	} else if (hasMore && attempt < RAW_PAGE_LOOP_LIMIT) {
		await loadMore();
		await handleHash(attempt + 1);
	}
}

// 面板互斥：同一时间只保留一个 twikoo 实例（发布框或某条动态的评论区）
function togglePanel(id: string) {
	activePanel = activePanel === id ? null : id;
}

function formatMomentTime(created: number): string {
	const diff = Date.now() - created;
	const DAY = 86400000;
	if (diff < 60000) return "刚刚";
	if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
	if (diff < DAY) return `${Math.floor(diff / 3600000)} 小时前`;
	if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`;
	return formatDateI18n(new Date(created));
}

onMount(() => {
	if (!commentConfig.enable) return;
	loadMoments().then(() => {
		(window as any).createPhotoSwipe?.();
		handleHash();
	});
	checkAdmin();
});

onDestroy(() => {
	clearTimeout(refreshTimer);
});
</script>

<!-- text-black/80 dark:text-white/80 与 Comment.astro 外层卡片保持一致：
     twikoo 组件自身 css 不设容器/文字颜色，暗色适配全靠外层继承色
     （实测：缺这两类时动态面板评论区在暗色下继承纯黑 rgb(0,0,0)，黑字黑底不可读） -->
<div class="card-base px-6 md:px-9 py-6 mb-4 text-black/80 dark:text-white/80">
	<!-- 页面标题 -->
	<div class="text-center mb-8 prose dark:prose-invert prose-base !max-w-none custom-md mt-2">
		<h1 class="text-3xl font-bold text-[var(--text-primary)] mb-2">动态</h1>
		<p class="text-[var(--text-secondary)]">记录日常的碎碎念</p>
	</div>

	<!-- 发布动态：仅 Twikoo 管理员可见（与评论区互斥，twikoo 1.7 全局单实例） -->
	{#if isAdmin}
		<div
			class="publish-box mb-6 rounded-[var(--radius-large)] border border-dashed border-[var(--line-color)] p-4 transition"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center">
					<div class="meta-icon">
						<Icon icon="material-symbols:edit-note" class="w-4 h-4" />
					</div>
					<span class="text-sm font-bold text-50">发布新动态</span>
				</div>
				<button class="action-btn" on:click={() => togglePanel("publish")}>
					<span>{activePanel === "publish" ? "收起" : "展开编辑"}</span>
				</button>
			</div>
			<div
				class="mt-3"
				class:thread-hidden={activePanel !== "publish"}
				use:panelMount={{ id: "publish", active: activePanel === "publish" }}
			></div>
		</div>
	{/if}

	{#if loading}
		<!-- 加载状态 -->
		<div class="flex flex-col gap-4">
			{#each [1, 2, 3] as _}
				<div
					class="rounded-[var(--radius-large)] bg-[var(--card-bg)] p-5 shadow-sm animate-pulse"
				>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10"></div>
						<div class="h-5 bg-black/10 dark:bg-white/10 rounded w-28"></div>
					</div>
					<div class="h-4 bg-black/5 dark:bg-white/5 rounded mt-4 w-full"></div>
					<div class="h-4 bg-black/5 dark:bg-white/5 rounded mt-2 w-2/3"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<!-- 错误状态 -->
		<div class="text-center py-16">
			<Icon icon="material-symbols:error-outline-rounded" class="w-16 h-16 mx-auto text-red-500 mb-4" />
			<p class="text-[var(--text-secondary)] text-lg mb-4">{error}</p>
			<button on:click={() => loadMoments()} class="btn-regular px-6 py-2 rounded-xl">
				重新加载
			</button>
		</div>
	{:else if moments.length === 0}
		<!-- 空状态 -->
		<div class="text-center py-16">
			<Icon
				icon="material-symbols:inbox-outline"
				class="w-16 h-16 mx-auto text-black/20 dark:text-white/20 mb-4"
			/>
			<p class="text-[var(--text-secondary)] text-lg">暂无动态</p>
		</div>
	{:else}
		<!-- 动态列表 -->
		<div class="flex flex-col gap-4">
			{#each moments as m (m.id)}
				<article
					id={`moment-${m.id}`}
					class:list={[
						"rounded-[var(--radius-large)] bg-[var(--card-bg)] border border-transparent p-5 shadow-sm transition-all duration-300 hover:shadow-md",
						highlightId === m.id && "!border-[var(--primary)] ring-2 ring-[var(--primary)]",
					]}
				>
					<!-- 头部：头像 + 昵称 + 博主徽标 + 时间 -->
					<div class="flex items-center gap-3">
						<img
							src={avatar}
							alt={profileConfig.name}
							loading="lazy"
							class="w-10 h-10 rounded-full object-cover border border-[var(--line-color)]"
						/>
						<div class="flex-1 flex items-center gap-2">
							<span class="font-bold text-90">{profileConfig.name}</span>
							<span
								class="rounded-md bg-[var(--btn-regular-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--btn-content)]"
							>
								博主
							</span>
						</div>
						<div class="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
							<Icon icon="material-symbols:schedule-outline-rounded" class="w-4 h-4" />
							<span>{formatMomentTime(m.created)}</span>
						</div>
					</div>
					<!-- 正文：Twikoo 返回的 HTML（markdown/图片/表情已由后端渲染） -->
					<div class="custom-md prose dark:prose-invert mt-3 !max-w-none break-words text-75">
						{@html m.comment}
					</div>
					<!-- 操作行 -->
					<div
						class="mt-3 flex items-center gap-2 border-t border-dashed border-black/10 dark:border-white/[0.15] pt-3"
					>
						<button
							on:click={() => togglePanel(m.id)}
							class="action-btn"
							class:action-btn-active={activePanel === m.id}
						>
							<Icon icon="material-symbols:chat-bubble-outline-rounded" class="w-4 h-4" />
							<span>评论{counts[m.id] != null ? `：${counts[m.id]}` : ""}</span>
						</button>
					</div>
					<!-- 评论区（wrapper 常驻，twikoo 替换内层节点后仍能被 wrapper 控制显隐） -->
					<div
						class="mt-3"
						class:thread-hidden={activePanel !== m.id}
						use:panelMount={{ id: m.id, active: activePanel === m.id }}
					></div>
				</article>
			{/each}
		</div>

		{#if hasMore}
			<button
				on:click={loadMore}
				disabled={loadingMore}
				class="btn-regular mx-auto mt-6 block px-6 py-2 rounded-xl disabled:opacity-50"
			>
				{loadingMore ? "加载中…" : "加载更多"}
			</button>
		{:else if moments.length > 0}
			<p class="mt-6 text-center text-sm text-black/30 dark:text-white/30">— 到底啦 —</p>
		{/if}
	{/if}
</div>

<style>
	/* 评论按钮：scoped 样式保证「图标 + 文字」横排与主题色，不依赖 Tailwind 类 */
	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
		color: var(--btn-content);
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.action-btn:hover {
		color: var(--primary);
		background: var(--btn-plain-bg-hover);
	}
	.action-btn:active {
		background: var(--btn-plain-bg-active);
	}
	.action-btn-active,
	.action-btn-active:hover {
		color: var(--primary);
		background: var(--btn-plain-bg-hover);
	}
	/* 面板收起：wrapper 常驻，仅切换显示（twikoo 已替换内层节点，不能靠删除节点销毁） */
	.thread-hidden {
		display: none;
	}
	/* 图标尺寸兜底：防止 svg 缺省尺寸导致布局异常 */
	.action-btn :global(svg) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	/* 发布框只保留输入区，隐藏 twikoo 自带评论列表（tk-* 类名是全局作用域） */
	.publish-box :global(.tk-comments-container) {
		display: none;
	}
	.publish-box :global(.tk-comments-title) {
		display: none;
	}
</style>
