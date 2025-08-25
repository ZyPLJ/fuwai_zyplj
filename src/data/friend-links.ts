export type FriendLinkItem = {
	title: string;
	url: string;
	avatar: string;
	desc: string;
};

export type FriendLinkSection = {
	title: string;
	items: FriendLinkItem[];
};

export const friendLinkSections: FriendLinkSection[] = [
	{
		title: "🌟 友情博客",
		items: [
			{
				title: "博客园",
				url: "https://www.cnblogs.com/ZYPLJ/",
				avatar: "https://pljzy.top/images/logo4.jpg",
				desc: "技术分享与学习交流的园地",
			},
			{
				title: "GitHub",
				url: "https://github.com/ZyPLJ",
				avatar:
					"https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
				desc: "代码托管与开源项目分享",
			},
			{
				title: "我的旧站",
				url: "https://pljzy.top",
				avatar: "https://pljzy.top/images/logo4.jpg",
				desc: "记录技术成长的足迹",
			},
		],
	},
	{
		title: "🛠️ 实用工具",
		items: [
			{
				title: "图片转Ico",
				url: "https://ico.pljzy.top",
				avatar: "https://ico.pljzy.top/logo.ico",
				desc: "在线png、jpg、jpeg图片转Ico工具",
			},
			{
				title: "文件快递柜",
				url: "https://share.pljzy.top",
				avatar: "https://share.pljzy.top/assets/logo_small.png",
				desc: "FileCodeBox, 文件快递柜, 口令传送箱, 匿名口令分享文本, 文件",
			},
			{
				title: "TXT转电子书工具",
				url: "https://ebook.deali.cn/",
				avatar: "https://ebook.deali.cn/static/favicon.ico",
				desc: "将TXT文本文件转换为EPUB、MOBI、AZW3等电子书格式",
			},
		],
	},
];
