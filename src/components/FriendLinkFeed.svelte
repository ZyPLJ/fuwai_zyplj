<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import { friendLinkFeedConfig } from "../config";

// 定义API返回的数据结构
interface StatisticalData {
	friends_num: number;
	active_num: number;
	article_num: number;
	last_updated_time: string;
}

interface ArticleData {
	title: string;
	created: string;
	link: string;
	author: string;
	avatar: string;
}

interface ApiResponse {
	statistical_data: StatisticalData;
	article_data: ArticleData[];
}

// 组件状态
let statisticalData: StatisticalData | null = null;
let allArticles: ArticleData[] = [];
let displayedArticles: ArticleData[] = [];
let randomArticle: ArticleData | null = null;
let currentPage = 1;
let totalPages = 1;
let articlesPerPage = 12;
let loading = false;
let error = "";

// API URL from config
const API_URL = friendLinkFeedConfig.apiUrl;

// 获取随机文章
function getRandomArticle() {
	if (allArticles.length > 0) {
		const randomIndex = Math.floor(Math.random() * allArticles.length);
		return allArticles[randomIndex];
	}
	return null;
}

// 获取友链朋友圈数据
async function fetchFriendLinkFeed() {
	loading = true;
	error = "";

	try {
		const response = await fetch(API_URL, {
			headers: {
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data: ApiResponse = await response.json();

		// 清理数据中的空格
		statisticalData = data.statistical_data;
		allArticles = data.article_data.map((article) => ({
			...article,
			link: article.link.trim().replace(/^`|`$/g, ""),
			avatar: article.avatar.trim().replace(/^`|`$/g, ""),
		}));

		// 计算总页数
		totalPages = Math.ceil(allArticles.length / articlesPerPage);

		// 更新当前页的显示数据
		updateDisplayedArticles();
		// 设置随机文章
		randomArticle = getRandomArticle();
	} catch (err) {
		error = err instanceof Error ? err.message : "获取友链朋友圈数据失败";
		console.error("Failed to fetch friend link feed:", err);
	} finally {
		loading = false;
	}
}

// 更新当前页显示的文章
function updateDisplayedArticles() {
	const startIndex = (currentPage - 1) * articlesPerPage;
	const endIndex = startIndex + articlesPerPage;
	displayedArticles = allArticles.slice(startIndex, endIndex);
}

// 处理页码点击
function handlePageClick(page: number) {
	if (page >= 1 && page <= totalPages && page !== currentPage) {
		currentPage = page;
		updateDisplayedArticles();
		// 滚动到页面顶部
		// window.scrollTo({ top: 0, behavior: "smooth" });
	}
}

// 获取分页显示的页码
function getPageNumbers(): number[] {
	const ADJ_DIST = 2;
	const VISIBLE = ADJ_DIST * 2 + 1;

	let count = 1;
	let l = currentPage;
	let r = currentPage;

	while (0 < l - 1 && r + 1 <= totalPages && count + 2 <= VISIBLE) {
		count += 2;
		l--;
		r++;
	}
	while (0 < l - 1 && count < VISIBLE) {
		count++;
		l--;
	}
	while (r + 1 <= totalPages && count < VISIBLE) {
		count++;
		r++;
	}

	let pages: number[] = [];
	for (let i = l; i <= r; i++) {
		pages.push(i);
	}

	return pages;
}

// 组件挂载时获取数据
onMount(() => {
	fetchFriendLinkFeed();
});
</script>

<div class="card-base px-8 py-6 mb-4">
  <!-- 页面标题 -->
  <div class="text-center mb-8 prose dark:prose-invert prose-base !max-w-none custom-md mt-2">
    <h1 class="text-3xl font-bold text-[var(--text-main)] mb-2">友链朋友圈</h1>
    <p class="text-[var(--text-secondary)]">与朋友们分享最新动态</p>
  </div>

  {#if loading}
    <!-- 加载状态 -->
    <div class="space-y-8">
      <!-- 统计卡片加载状态 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each [1, 2, 3, 4] as _}
          <div class="bg-[var(--card-bg)] rounded-lg p-6 shadow-sm animate-pulse border-none">
            <div class="h-12 bg-[var(--text-secondary)]/20 rounded mb-2 w-20"></div>
            <div class="h-6 bg-[var(--text-secondary)]/10 rounded w-16"></div>
          </div>
        {/each}
      </div>
      
      <!-- 文章列表加载状态 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each Array(6) as _}
          <div class="bg-[var(--card-bg)] rounded-lg p-6 shadow-sm animate-pulse border-none">
            <div class="h-10 bg-[var(--text-secondary)]/20 rounded mb-4"></div>
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-[var(--text-secondary)]/20 mr-3"></div>
              <div class="flex-1">
                <div class="h-5 bg-[var(--text-secondary)]/20 rounded w-1/3 mb-1"></div>
              </div>
              <div class="h-5 bg-[var(--text-secondary)]/20 rounded w-20"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  
  {:else if error}
    <!-- 错误状态 -->
    <div class="text-center py-16">
      <Icon icon="material-symbols:error-outline" class="w-16 h-16 mx-auto text-red-500 mb-4" />
      <p class="text-[var(--text-secondary)] text-lg mb-4">{error}</p>
      <button 
        on:click={fetchFriendLinkFeed} 
        class="btn-regular px-6 py-2 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
      >
        重新加载
      </button>
    </div>
  
  {:else}
    <!-- 随机文章卡片 -->
    {#if randomArticle}
      <div class="random-article-card bg-[var(--card-bg)] rounded-lg p-6 shadow-sm mb-8 transition-all duration-300 hover:shadow-md">
        <h3 class="text-lg font-bold text-[var(--text-secondary)] mb-4">随机钓鱼</h3>
        
        <div class="article-content">
          <h4 class="text-xl font-bold mb-4">
            <a 
              href={randomArticle.link} 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors duration-300"
            >
              {randomArticle.title}
            </a>
          </h4>
          
          <div class="flex items-center justify-between gap-4">
            <div class="article-meta flex items-center">
              <img 
                src={randomArticle.avatar} 
                alt={randomArticle.author} 
                class="author-avatar w-8 h-8 rounded-full mr-2 object-cover border-[var(--border-color)]" 
                loading="lazy"
              />
              <span class="author-name text-[var(--text-secondary)]">{randomArticle.author}</span>
            </div>
            
            <div class="flex items-center gap-2">
              <button 
                on:click={() => randomArticle = getRandomArticle()}
                class="btn-card p-1.5 rounded-lg text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                aria-label="刷新随机文章"
              >
                <Icon icon="material-symbols:refresh" class="w-5 h-5" />
              </button>
              <a 
                href={randomArticle.link} 
                target="_blank" 
                rel="noopener noreferrer"
                class="btn-card px-4 py-1 rounded-lg text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
              >
                过去转转
              </a>
            </div>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- 统计数据卡片 -->
    {#if statisticalData}
      <div class="stats-container grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="stat-card bg-[var(--card-bg)] rounded-lg p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div class="stat-number friends-num text-3xl font-bold text-[var(--primary)] mb-2">{statisticalData.friends_num}</div>
          <div class="stat-label text-[var(--text-secondary)]">好友总数</div>
        </div>
        
        <div class="stat-card bg-[var(--card-bg)] rounded-lg p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div class="stat-number active-num text-3xl font-bold text-[var(--primary)] mb-2">{statisticalData.active_num}</div>
          <div class="stat-label text-[var(--text-secondary)]">活跃好友</div>
        </div>
        
        <div class="stat-card bg-[var(--card-bg)] rounded-lg p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div class="stat-number article-num text-3xl font-bold text-[var(--primary)] mb-2">{statisticalData.article_num}</div>
          <div class="stat-label text-[var(--text-secondary)]">文章总数</div>
        </div>
      </div>
    {/if}
    
    <!-- 文章列表 -->
    {#if displayedArticles.length > 0}
      <div class="articles-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 mb-8">
        {#each displayedArticles as article}
          <div class="article-card bg-[var(--card-bg)] rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div class="article-content p-6">
              <div class="w-[100%] text-left font-bold
                     group-hover:translate-x-1 transition-all group-hover:text-[var(--primary)]
                     text-75 whitespace-nowrap overflow-ellipsis overflow-hidden">
                <a 
                  href={article.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="text-[var(--text-main)] hover:text-[var(--primary)] transition-colors duration-300"
                >
                  {article.title}
                </a>
              </div>
              <div class="article-meta flex items-center mt-2">
                <img 
                  src={article.avatar} 
                  alt={article.author} 
                  class="author-avatar w-10 h-10 rounded-full mr-3 object-cover border-[var(--border-color)]" 
                  loading="lazy"
                />
                <span class="author-name text-[var(--text-secondary)] font-medium flex-1">{article.author}</span>
                <span class="article-date text-[var(--text-secondary)] text-sm">{article.created.split(' ')[0]}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
      
      <!-- 最后更新时间 -->
      {#if statisticalData}
        <div class="update-time text-center mt-8 text-[var(--text-secondary)] text-sm">
          最后更新时间: {statisticalData.last_updated_time}
        </div>
      {/if}
    {:else}
      <!-- 无数据状态 -->
      <div class="text-center py-16">
        <Icon icon="material-symbols:article-outline" class="w-16 h-16 mx-auto text-[var(--text-secondary)]/50 mb-4" />
        <p class="text-[var(--text-secondary)]">暂无文章数据</p>
      </div>
    {/if}
  {/if}
</div>
<!-- Pagination -->
{#if totalPages > 1}
  <div class="flex flex-row gap-3 justify-center">
    <!-- Previous Page -->
    <button
            on:click={() => handlePageClick(currentPage - 1)}
            disabled={currentPage <= 1}
            class="btn-card overflow-hidden rounded-lg text-[var(--primary)] w-11 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={currentPage > 1 ? "Previous Page" : null}
    >
      <Icon icon="material-symbols:chevron-left-rounded" class="text-[1.75rem]" />
    </button>

    <!-- Page Numbers -->
    <div class="bg-[var(--card-bg)] flex flex-row rounded-lg items-center text-neutral-700 dark:text-neutral-300 font-bold">
      {#if currentPage > 3}
        <button
                on:click={() => handlePageClick(1)}
                class="btn-card w-11 h-11 rounded-lg overflow-hidden active:scale-[0.85]"
                aria-label="Page 1"
        >
          1
        </button>
        {#if currentPage > 4}
          <Icon icon="material-symbols:more-horiz" class="mx-1" />
        {/if}
      {/if}

      {#each getPageNumbers() as pageNum}
        {#if pageNum === currentPage}
          <div class="h-11 w-11 rounded-lg bg-[var(--primary)] flex items-center justify-center font-bold text-white dark:text-black/70">
            {pageNum}
          </div>
        {:else}
          <button
                  on:click={() => handlePageClick(pageNum)}
                  class="btn-card w-11 h-11 rounded-lg overflow-hidden active:scale-[0.85]"
                  aria-label="Page {pageNum}"
          >
            {pageNum}
          </button>
        {/if}
      {/each}

      {#if currentPage < totalPages - 2}
        {#if currentPage < totalPages - 3}
          <Icon icon="material-symbols:more-horiz" class="mx-1" />
        {/if}
        <button
                on:click={() => handlePageClick(totalPages)}
                class="btn-card w-11 h-11 rounded-lg overflow-hidden active:scale-[0.85]"
                aria-label="Page {totalPages}"
        >
          {totalPages}
        </button>
      {/if}
    </div>

    <!-- Next Page -->
    <button
            on:click={() => handlePageClick(currentPage + 1)}
            disabled={currentPage >= totalPages}
            class="btn-card overflow-hidden rounded-lg text-[var(--primary)] w-11 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={currentPage < totalPages ? "Next Page" : null}
    >
      <Icon icon="material-symbols:chevron-right-rounded" class="text-[1.75rem]" />
    </button>
  </div>
{/if}

<style>
/* 卡片基础样式 */
.stat-card,
.article-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.05);
  transition: all 0.25s ease;
  backdrop-filter: var(--backdrop-filter);
}
.stat-card:hover,
.article-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.08);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 卡片样式优化 */
.stat-card, .article-card {
    backdrop-filter: var(--backdrop-filter);
  }

/* 标题优化 */
.article-title {
  font-size: 1rem;
  line-height: 1.5;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .stats-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 3px;
  }
  
  .articles-container {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .stat-number {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .stats-container {
    grid-template-columns: 1fr;
  }
  
  .text-center.mb-8 h1 {
    font-size: 1.75rem;
  }
}

/* 加载动画 */
/* 随机文章卡片样式 */
.random-article-card {
  border: 1px solid var(--border-color);
  backdrop-filter: var(--backdrop-filter);
}

.random-article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.08);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 平滑过渡 */
.article-card, .stat-card, .btn-card {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* 链接样式优化 */
.article-title a {
  text-decoration: none;
}

.article-title a:hover {
  text-decoration: underline;
  text-decoration-color: var(--primary);
  text-underline-offset: 2px;
}
</style>