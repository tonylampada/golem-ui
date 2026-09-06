import type { Preview } from '@storybook/react-vite'
import '../src/styles.css'

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: {
      storySort: { order: ['Introduction', 'Components', 'Adapters', ['Overview', '*']] },
    },
  },
}

export default preview
