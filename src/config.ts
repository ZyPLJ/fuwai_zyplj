import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "ZY知识库",
	subtitle: "欢迎来到我的博客",
	lang: "zh_CN", // 'en', 'zh_CN', 'zh_TW', 'ja', 'ko', 'es', 'th'
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "assets/images/banner.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		// 如果要使用MP4视频，可以这样配置：
		// src: "/videos/banner-video.mp4", // 视频文件放在 public/videos/ 目录下
		// type: "video", // 设置为视频类型
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		type: "image", // Support 'image' or 'video' format
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		{
			src: "/favicon/logo-32.ico", // Path of the favicon, relative to the /public directory
			theme: "light", // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
			sizes: "32x32", // (Optional) Size of the favicon, set only if you have favicons of different sizes
		},
	],
	clarity: {
		enable: false, // 是否启用 Microsoft Clarity 分析
		projectId: "", // Clarity 项目 ID
	},
	musicPlayer: {
		enable: true, // 是否启用音乐播放器
	},
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "社交",
			url: "/links/",
			children: [LinkPreset.Links, LinkPreset.Feed], // 如果没有友链朋友圈功能，则注释掉
		},
		// LinkPreset.Images, // 如果没有lsky.pro图床，则注释掉 https://docs.lsky.pro/archive/free/v2/
		{
			name: "开往🚆",
			url: "https://www.travellings.cn/go.html", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/logo.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "ZyPlj",
	bio: "一个热爱编程的全栈开发者，热爱开源，热爱分享。",
	links: [
		{
			name: "博客园",
			icon: "fa6-solid:blog", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://www.cnblogs.com/ZYPLJ",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/ZyPLJ",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const commentConfig = {
	enable: false,
	provider: "twikoo",
	twikoo: {
		envId: "", // 移除末尾的斜杠
		region: "",
		lang: "zh-CN",
	},
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

export const imageLibraryConfig = {
	apiBaseUrl: "", // 兰空图床API地址
	apiToken: "", // 用户token
	albumsEndpoint: "/albums?order=earliest", // 相册列表接口
	imagesEndpoint: "/images", // 图片列表接口
	defaultAlbumId: 4, // 默认相册ID
};

export const friendLinkFeedConfig = {
	apiUrl: "", // 友链朋友圈API地址 https://blog.liushen.fun/posts/4dc716ec/#%E7%88%AC%E5%8F%96%E6%9C%8D%E5%8A%A1%E9%83%A8%E7%BD%B2
};
