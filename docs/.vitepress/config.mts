import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'ja_JP',
  title: "BedrockDocs",
  description: 'Minecraft Bedrock Edition開発者向けのドキュメント',
  head: [ ['link', { rel: 'icon', href: 'logo.svg' }] ],
  
  base: '/bedrock-docs/',

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'プロトコル', link: '/protocol/intro/' },
      { text: 'RakNet', link: '/raknet/intro/' },
    ],

    sidebar: {
      '/protocol/': [
        {
          text: 'プロトコル',
          items: [
            { text: '導入', link: '/protocol/intro' },
          ]
        }
      ],
      '/raknet/': [
        {
          text: 'RakNet',
          items: [
            { text: '導入', link: '/raknet/intro' },
            { text: '実装リスト', link: '/raknet/implementations' },
            {
              text: 'プロトコル',
              items: [
                { text: '通信', link: '/raknet/protocol/communication' },
                { text: '全体の処理', link: '/raknet/protocol/entire_process' },
                { text: '送信', link: '/raknet/protocol/send' },
                { text: '受信', link: '/raknet/protocol/receive' }
              ]
            }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/StudioGrails/bedrock-docs' }
    ],

    search: {
      provider: 'local'
    }
  },

  ignoreDeadLinks: true,

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern'
        }
      }
    }
  },

  markdown: {
    math: true
  }
})
