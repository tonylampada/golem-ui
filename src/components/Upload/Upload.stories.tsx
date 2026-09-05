import type { Meta, StoryObj } from '@storybook/react-vite'
import { Upload } from './Upload'
import * as examples from './Upload.examples'

const meta = {
  title: 'Components/Upload',
  component: Upload,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Upload>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every story is one example from `Upload.examples.tsx` — the same file the tests import — framed
 * at the width that example is meant to be read at. `renderExample` decides which surface it is,
 * so the picker is seen inside a composer rather than on its own.
 */
const story = (example: examples.UploadExample): Story => ({
  name: example.name,
  args: example.props,
  parameters: { docs: { description: { story: example.summary } } },
  render: () => (
    <div style={{ width: example.viewportWidth, maxWidth: '100%', padding: 16 }}>
      {examples.renderExample(example)}
    </div>
  ),
})

export const EmptyDropZone = story(examples.emptyZone)
export const GalleryOfPhotos = story(examples.photoGallery)
export const MixedFilesAsList = story(examples.mixedList)
export const Captions = story(examples.withCaptions)
export const UploadFails = story(examples.uploadFails)
export const PickerInComposer = story(examples.pickerInComposer)
export const InvalidConfig = story(examples.invalidConfig)
