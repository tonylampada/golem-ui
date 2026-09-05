import remarkGfm from 'remark-gfm'
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    {
      // GFM so a plain markdown table in a component's docs page renders as a table.
      name: '@storybook/addon-docs',
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
  ],
  framework: { name: '@storybook/react-vite', options: {} },
  docs: { defaultName: 'Docs' },
}

export default config
