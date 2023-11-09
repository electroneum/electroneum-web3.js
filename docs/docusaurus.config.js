/*
This file is part of web3.js.

web3.js is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

web3.js is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');
const { join } = require('path');

const packages = [
	'@etn-sc/web3',
	'@etn-sc/web3-eth',
	'@etn-sc/web3-eth-contract',
	'@etn-sc/web3-utils',
	'@etn-sc/web3-validator',
	'@etn-sc/web3-types',
	'@etn-sc/web3-core',
	'@etn-sc/web3-errors',
	'@etn-sc/web3-net',
	'@etn-sc/web3-eth-abi',
	'@etn-sc/web3-eth-accounts',
	'@etn-sc/web3-eth-ens',
	'@etn-sc/web3-eth-iban',
	'@etn-sc/web3-eth-personal',
	'@etn-sc/web3-providers-http',
	'@etn-sc/web3-providers-ws',
	'@etn-sc/web3-providers-ipc',
];

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: 'etn-sc web3.js',
	tagline: 'The ultimate JavaScript library for Electroneum SmartChain',
	url: 'https://docs.web3js.org',
	baseUrl: '/',
	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'throw',
	favicon: 'img/favicon.ico',

	// GitHub pages deployment config.
	// If you aren't using GitHub pages, you don't need these.
	organizationName: 'ChainSafe', // Usually your GitHub org/user name.
	projectName: 'electroneum-web3.js', // Usually your repo name.

	// Even if you don't use internalization, you can use this field to set useful
	// metadata like html lang. For example, if your site is Chinese, you may want
	// to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: 'en',
		locales: ['en'],
	},

	plugins: [
		'@docusaurus/theme-live-codeblock',
		[
			'@mpetrunic/docusaurus-plugin-typedoc-api',
			{
				projectRoot: join(__dirname, '..'),
				// Monorepo
				packages: packages.map(p => `packages/${p}`),
				minimal: false,
				debug: true,
				changelogs: true,
				readmes: false,
				tsconfigName: 'docs/tsconfig.docs.json',
				typedocOptions: {
					plugin: [
						'typedoc-monorepo-link-types',
						'typedoc-plugin-extras',
						'typedoc-plugin-mdn-links',
					],
				},
			},
		],
		'docusaurus-lunr-search',
	],
	presets: [
		[
			'classic',
			/** @type {import('@docusaurus/preset-classic').Options} */
			({
				docs: {
					sidebarPath: require.resolve('./sidebars.js'),
					routeBasePath: '/', // Serve the docs at the site's root
					// Please change this to your repo.
					// Remove this to remove the "edit this page" links.
					editUrl: 'https://github.com/electroneum/electroneum-web3.js/tree/4.x/docs',
				},
				theme: {
					customCss: require.resolve('./src/css/custom.css'),
				},
			}),
		],
	],

	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		({
			navbar: {
				title: 'etn-sc Web3.js Docs',
				logo: {
					src: 'img/web3js.svg',
				},
				items: [
					{
						to: '/',
						activeBasePath: '/',
						label: 'Documentation',
						position: 'left',
					},
					{
						to: 'api', // 'api' is the 'out' directory
						label: 'API',
						position: 'left',
					},
					{
						to: '/glossary/json_interface',
						activeBasePath: '/glossary/',
						label: 'Glossary',
						position: 'left',
					},
					{
						href: 'https://github.com/electroneum/electroneum-web3.js/tree/4.x/',
						label: 'GitHub',
						position: 'right',
					},
				],
			},
			footer: {
				style: 'dark',
				links: [
					{
						title: 'Community',
						items: [
							{
								label: 'Stack Overflow',
								href: 'https://stackoverflow.com/questions/tagged/web3js',
							},
							{
								label: 'Discord',
								href: 'https://discord.com/invite/pb3U4zE8ca',
							},
						],
					},
				],
				copyright: `Copyright © ${new Date().getFullYear()} @etn-sc/Web3.js . Built with Docusaurus.`,
			},
			prism: {
				theme: lightCodeTheme,
				darkTheme: darkCodeTheme,
			},
			liveCodeBlock: {
				/**
				 * The position of the live playground, above or under the editor
				 * Possible values: "top" | "bottom"
				 */
				playgroundPosition: 'bottom',
			},
		}),
};

module.exports = config;
