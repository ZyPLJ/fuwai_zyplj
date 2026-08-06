import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";

export type SiteConfig = {
	title: string;
	subtitle: string;

	/** 站点开始日期（YYYY-MM-DD），用于侧边栏「站点统计」的运行天数计算 */
	siteStartDate: string;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	themeColor: {
		hue: number;
		fixed: boolean;
	};
	banner: {
		enable: boolean;
		src: string;
		position?: "top" | "center" | "bottom";
		type?: "image" | "video"; // 支持图片或视频格式
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	/** 图片优化配置（移植自 Firefly，用于文章封面等 astro:assets 图片） */
	imageOptimization: {
		/** 生成的图片格式: "both" | "avif" | "webp" */
		formats?: "both" | "avif" | "webp";
		/** 压缩质量 1-100，默认 80 */
		quality?: number;
		/** 需要 referrerpolicy="no-referrer" 的域名通配符列表（防盗链 403），如 ["*.example.com"] */
		noReferrerDomains?: string[];
	};

	favicon: Favicon[];

	clarity: {
		enable: boolean;
		projectId: string;
	};

	musicPlayer: {
		enable: boolean;
	};

	/**
	 * Desktop pet (CodexPet) floating companion.
	 * Assets live under public/pets/<id>/; SDK at public/lib/codex-pet.js.
	 * Mounted once on body with mode:fixed so Swup page swaps do not remount it.
	 */
	pet: {
		enable: boolean;
		/** Folder name under /pets/, e.g. "rich-paimon" | "firefly" | "fufu-sticker" | "ganyu-pet-v2" */
		id: string;
		/**
		 * Full URL of spritesheet.webp (CDN). Empty / omitted → local /pets/<id>/spritesheet.webp.
		 * CDN must allow CORS (Access-Control-Allow-Origin) so canvas can crop frames.
		 */
		spritesheet?: string;
		/** Display scale; 1 = native cell size (192×208) */
		scale?: number;
		/** ms per frame */
		speed?: number;
		/** Corner name or pixel coords */
		position?:
			| "bottom-right"
			| "bottom-left"
			| "top-right"
			| "top-left"
			| "center";
		/** Corner margin in px */
		margin?: number;
		/** Initial animation state */
		state?: string;
		draggable?: boolean;
		clickCycle?: boolean;
	};
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
	Links = 3,
	Images = 4,
	Feed = 5,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
	children?: (NavBarLink | LinkPreset)[]; // 支持子菜单，可以是NavBarLink或LinkPreset
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
};
