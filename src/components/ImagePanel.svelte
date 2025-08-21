<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import { imageLibraryConfig } from "../config";
import { formatDateI18n } from "@utils/date-utils";

interface ImageData {
	key: string;
	name: string;
	origin_name: string;
	size: number;
	mimetype: string;
	extension: string;
	md5: string;
	sha1: string;
	width: number;
	height: number;
	human_date: string;
	date: string;
	pathname: string;
	links: {
		url: string;
		html: string;
		bbcode: string;
		markdown: string;
		markdown_with_link: string;
		thumbnail_url: string;
	};
}

interface Album {
	id: number;
	name: string;
	intro: string;
	image_num: number;
}

interface ApiResponse {
	status: boolean;
	message: string;
	data: {
		current_page: number;
		data: ImageData[];
		first_page_url: string;
		from: number;
		last_page: number;
		last_page_url: string;
		links: Array<{
			url: string | null;
			label: string;
			active: boolean;
		}>;
		next_page_url: string | null;
		path: string;
		per_page: number;
		prev_page_url: string | null;
		to: number;
		total: number;
	};
}

interface AlbumResponse {
	status: boolean;
	message: string;
	data: {
		data: Album[];
		// 其他分页信息...
	};
}

let images: ImageData[] = [];
let albums: Album[] = [];
let currentAlbum: Album | null = null;
let currentPage = 1;
let totalPages = 1;
let totalImages = 0;
let loading = false;
let error = "";
let bannerImage: ImageData | null = null;

const API_BASE_URL = imageLibraryConfig.apiBaseUrl;
const API_TOKEN = imageLibraryConfig.apiToken;
const ALBUMS_ENDPOINT = imageLibraryConfig.albumsEndpoint;
const IMAGES_ENDPOINT = imageLibraryConfig.imagesEndpoint;
const DEFAULT_ALBUM_ID = imageLibraryConfig.defaultAlbumId;

async function fetchAlbums() {
	try {
		const response = await fetch(`${API_BASE_URL}${ALBUMS_ENDPOINT}`, {
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${API_TOKEN}`,
			},
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data: AlbumResponse = await response.json();

		if (data.status) {
			albums = data.data.data;
			// 设置默认相册
			if (albums.length > 0) {
				const defaultAlbum = 
					albums.find((album) => album.id === DEFAULT_ALBUM_ID) || albums[0];
				currentAlbum = defaultAlbum;
				// 获取默认相册的图片
				await fetchImages(1, defaultAlbum.id);
			}
		} else {
			error = data.message || "获取相册失败";
		}
	} catch (err) {
		error = err instanceof Error ? err.message : "网络请求失败";
	}
}

async function fetchImages(page = 1, albumId?: number) {
	loading = true;
	error = "";

	const targetAlbumId = albumId || currentAlbum?.id || DEFAULT_ALBUM_ID;

	try {
		const response = await fetch(
			`${API_BASE_URL}${IMAGES_ENDPOINT}?page=${page}&album_id=${targetAlbumId}`,
			{
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${API_TOKEN}`,
				},
			},
		);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data: ApiResponse = await response.json();

		if (data.status) {
			images = data.data.data;
			currentPage = data.data.current_page;
			totalPages = data.data.last_page;
			totalImages = data.data.total;

			// 如果是切换相册或者是第一页，更新banner图片
			if (albumId && page === 1) {
				bannerImage = images[0] || null;
			}
		} else {
			error = data.message || "获取图片失败";
		}
	} catch (err) {
		error = err instanceof Error ? err.message : "网络请求失败";
	} finally {
		loading = false;
	}
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function handlePageClick(page: number) {
	if (page >= 1 && page <= totalPages && page !== currentPage) {
		fetchImages(page, currentAlbum?.id);
	}
}

async function handleAlbumSwitch(album: Album) {
	if (album.id !== currentAlbum?.id) {
		currentAlbum = album;
		currentPage = 1; // 重置到第一页
		await fetchImages(1, album.id);
	}
}

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

onMount(() => {
	fetchAlbums();
});
</script>

<div class="card-base px-8 py-6">
	<!-- Header -->
	<div class="mb-6">
		<!-- Album Tabs -->
		{#if albums.length > 0}
			<div class="flex flex-wrap gap-2 mb-6">
				{#each albums as album}
					<button
						on:click={() => handleAlbumSwitch(album)}
						class="btn-regular h-8 text-sm px-3 rounded-lg"
					>
						<div class="flex items-center gap-2">
							<Icon icon="material-symbols:photo-library" class="w-4 h-4" />
							<span>{album.name}</span>
							<span class="text-xs opacity-75">({album.image_num})</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Banner Image - 使用当前相册的第一张图片 -->
		{#if loading}
			<!-- Banner Loading State -->
			<div class="gallery-group bg-[var(--card-bg)] rounded-[var(--radius-large)] overflow-hidden transition-all duration-300 hover:shadow-lg mb-6">
				<div class="gallery-header cursor-pointer relative h-48 overflow-hidden group">
					<div class="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
					<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
					<div class="absolute bottom-4 left-4 text-white">
						<div class="h-6 bg-white/20 rounded mb-2 animate-pulse"></div>
						<div class="h-4 bg-white/20 rounded mb-1 animate-pulse w-24"></div>
						<div class="h-3 bg-white/20 rounded w-32 animate-pulse"></div>
					</div>
					<div class="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
						<div class="h-4 bg-white/20 rounded w-20 animate-pulse"></div>
					</div>
				</div>
			</div>
		{:else if bannerImage}
			<div class="gallery-group bg-[var(--card-bg)] rounded-[var(--radius-large)] overflow-hidden transition-all duration-300 hover:shadow-lg mb-6">
				<div class="gallery-header cursor-pointer relative h-48 overflow-hidden group">
					<img
							src={bannerImage.links.url}
							alt={bannerImage.origin_name}
							class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
							loading="lazy"
					/>
					<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
					<div class="absolute bottom-4 left-4 text-white">
						<h3 class="text-xl font-bold mb-1">{currentAlbum?.name}</h3>
						<p class="text-sm opacity-90">{totalImages} 张图片</p>
						<p class="text-xs opacity-75 mt-1">{currentAlbum?.intro || ''}</p>
					</div>
					<div class="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
						{formatDateI18n(bannerImage.date)}
					</div>
				</div>
			</div>
		{/if}

		<!-- Current Album Info -->
		{#if currentAlbum}
			<p class="text-black/50 dark:text-white/50">
				当前相册：{currentAlbum.name} - 共 {totalImages} 张图片，第 {currentPage} 页，共 {totalPages} 页，如有侵权联系博主删除！
			</p>
		{:else}
			<p class="text-black/50 dark:text-white/50">
				共 {totalImages} 张图片，第 {currentPage} 页，共 {totalPages} 页，如有侵权联系博主删除！
			</p>
		{/if}
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="text-center py-12">
			<div class="text-red-500 text-lg mb-4">{error}</div>
			<button
				on:click={() => currentAlbum ? fetchImages(currentPage, currentAlbum.id) : fetchImages(currentPage)}
				class="btn-card px-6 py-2 rounded-lg"
			>
				重试
			</button>
		</div>
	{:else}
		<!-- Images Grid -->
		<div class="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 mb-8">
			{#each images as image}
				<div class="group relative overflow-hidden rounded-lg bg-[var(--card-bg)] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-6 break-inside-avoid">
					<!-- Image Container -->
					<div
						class="relative overflow-hidden bg-gray-100 dark:bg-gray-800"
						style="aspect-ratio: {image.width} / {image.height};"
					>
						<img
							src={image.links.thumbnail_url || image.links.url}
							alt={image.origin_name}
							title={image.origin_name}
							class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
							loading="lazy"
						/>

						<!-- GIF Indicator -->
						{#if image.extension.toLowerCase() === 'gif'}
							<div class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
								GIF
							</div>
						{/if}

						<!-- Overlay on hover -->
						<div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
							<div class="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
								<a
									href={image.links.url}
									target="_blank"
									rel="noopener noreferrer"
									class="btn-card bg-white/90 hover:bg-white text-black px-4 py-2 rounded-lg shadow-lg"
								>
									<Icon icon="material-symbols:open-in-new" class="w-5 h-5 mr-2" />
									查看原图
								</a>
							</div>
						</div>
					</div>

					<!-- Image Info -->
					<div class="p-4">
						<h3 class="font-semibold text-black/75 dark:text-white/75 mb-2 line-clamp-2 group-hover:text-[var(--primary)] transition-colors duration-300">
							{image.origin_name}
						</h3>

						<div class="space-y-1 text-sm text-black/50 dark:text-white/50">
							<div class="flex items-center justify-between">
								<span>尺寸:</span>
								<span>{image.width} × {image.height}</span>
							</div>
							<div class="flex items-center justify-between">
								<span>大小:</span>
								<span>{formatFileSize(image.size * 1024)}</span>
							</div>
							<div class="flex items-center justify-between">
								<span>格式:</span>
								<span class="uppercase">{image.extension}</span>
							</div>
							<div class="flex items-center justify-between">
								<span>上传:</span>
								<span>{image.human_date}</span>
							</div>
						</div>
					</div>
				</div>
			{/each}
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
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
