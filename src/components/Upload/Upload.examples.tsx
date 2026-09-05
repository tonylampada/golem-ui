import { useState, type ReactNode } from 'react'
import type { GolemProps } from '../../abi'
import type { FileRef } from '../../adapters'
import { fakeFiles, placeholderImage, type FakeFileSeed } from '../../adapters/fake'
import { Upload, type UploadAdapters } from './Upload'
import type { UploadConfigInput } from './Upload.config'

export type UploadProps = GolemProps<UploadConfigInput, UploadAdapters>

export interface UploadExample {
  name: string
  summary: string
  props: UploadProps
  /** `picker` renders inside a stand-in composer; everything else is the whole component. */
  surface?: 'upload' | 'picker'
  /** The width the example is meant to be read at; the story frames it there. */
  viewportWidth: number
}

/**
 * Adapters are built once, at module load, so props identity is stable: a component handed a new
 * adapter on every render would re-subscribe and re-list on every render.
 *
 * The files are Northgate Cycles', the invented bike shop the showcase is set in. Nothing here is
 * a photograph: every picture is drawn by `placeholderImage` at load, a few hundred bytes of SVG,
 * so the repository carries no image files and the gallery still has something in it.
 */

const UPLOADED = '2026-09-10T'

/** A drawn stand-in for a shop photo, named as the shop would have named it. */
const photo = (
  id: string,
  name: string,
  label: string,
  hue: number,
  minute: string,
  caption?: string,
): FakeFileSeed => ({
  id,
  folder: 'shop',
  name,
  contentType: 'image/jpeg',
  size: 1_400_000,
  content: placeholderImage(label, hue),
  uploadedAt: `${UPLOADED}${minute}:00Z`,
  ...(caption === undefined ? {} : { caption }),
})

const doc = (
  id: string,
  name: string,
  contentType: string,
  size: number,
  minute: string,
): FakeFileSeed => ({
  id,
  folder: 'shop',
  name,
  contentType,
  size,
  uploadedAt: `${UPLOADED}${minute}:00Z`,
})

export const shopPhotos: FakeFileSeed[] = [
  photo('f-1', 'rove-rear-wheel-before.jpg', 'Kona Rove · rear wheel', 205, '11:40'),
  photo('f-3', 'rockhopper-fork-seals.jpg', 'Rockhopper · fork lowers', 30, '09:40'),
  photo('f-5', 'trek-fx3-collected.jpg', 'Trek FX 3 · on the rack', 150, '08:20'),
  photo('f-6', 'brompton-hinge-plate.jpg', 'Brompton · hinge plate', 275, '07:55'),
]

export const shopFiles: FakeFileSeed[] = [
  ...shopPhotos,
  doc('f-2', 'supplier-invoice-2211.pdf', 'application/pdf', 327_680, '10:15'),
  doc('f-4', 'gazelle-cutout-noise.m4a', 'audio/mp4', 184_320, '09:05'),
  doc('f-7', 'winter-service-prices.pdf', 'application/pdf', 98_304, '07:30'),
]

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const emptyFiles = fakeFiles()
const photoFiles = fakeFiles({ seed: shopPhotos })
const mixedFiles = fakeFiles({ seed: shopFiles })
const captionedFiles = fakeFiles({
  seed: [
    photo(
      'f-1',
      'rove-rear-wheel-before.jpg',
      'Kona Rove · rear wheel',
      205,
      '11:40',
      'Three broken spokes, drive side.',
    ),
    photo('f-3', 'rockhopper-fork-seals.jpg', 'Rockhopper · fork lowers', 30, '09:40'),
  ],
})

/** The store turns this one name away, which is the only way to see the failed row. */
export const FAILING_NAME = 'bench-photo-too-dark.jpg'
const failingFiles = fakeFiles({ seed: shopPhotos.slice(0, 2), failOn: FAILING_NAME })

const pickerFiles = fakeFiles()

export const emptyZone: UploadExample = {
  name: 'Empty drop zone',
  summary:
    'A folder with nothing in it: the drop zone, the limits written under it, and the `emptyState` line where the gallery will be. Drop a file on it and it goes up.',
  viewportWidth: 640,
  props: {
    config: {
      folder: 'shop',
      accept: PHOTO_TYPES,
      maxFiles: 12,
      maxSizeMb: 8,
      emptyState: 'No photos on this ticket yet. Drop one from the bench.',
    },
    adapters: { files: emptyFiles },
  },
}

export const photoGallery: UploadExample = {
  name: 'Gallery of photos',
  summary:
    'Four shop photos as a grid of thumbnails, each one drawn rather than photographed. Click one for the lightbox; Delete asks before it removes anything.',
  viewportWidth: 640,
  props: {
    config: {
      folder: 'shop',
      accept: PHOTO_TYPES,
      maxFiles: 12,
      maxSizeMb: 8,
      capture: 'environment',
    },
    adapters: { files: photoFiles },
  },
}

export const mixedList: UploadExample = {
  name: 'Mixed files as a list',
  summary:
    'The same folder with invoices and a voice memo in it, read as `layout: "list"`: one row each, with an icon, the name and the size.',
  viewportWidth: 640,
  props: {
    config: {
      folder: 'shop',
      layout: 'list',
      maxFiles: 20,
      maxSizeMb: 25,
    },
    adapters: { files: mixedFiles },
  },
}

export const withCaptions: UploadExample = {
  name: 'Captions',
  summary:
    'Captions on: a line under each tile, saved through `Files.caption` when the reader leaves the box.',
  viewportWidth: 640,
  props: {
    config: {
      folder: 'shop',
      accept: PHOTO_TYPES,
      captions: true,
      maxSizeMb: 8,
    },
    adapters: { files: captionedFiles },
  },
}

export const uploadFails: UploadExample = {
  name: 'An upload that fails',
  summary: `A store that refuses one name. Drop a file called ${FAILING_NAME} and its row turns red with the store's own sentence on it, while everything else in the batch still goes up.`,
  viewportWidth: 640,
  props: {
    config: {
      folder: 'shop',
      accept: PHOTO_TYPES,
      maxSizeMb: 8,
    },
    adapters: { files: failingFiles },
  },
}

export const pickerInComposer: UploadExample = {
  name: 'Picker in a composer',
  summary:
    'The compact surface: a button in a message box. What it uploads comes back as file refs the composer holds, shown as chips it can take off again.',
  surface: 'picker',
  viewportWidth: 480,
  props: {
    config: {
      folder: 'chat',
      accept: [...PHOTO_TYPES, 'application/pdf'],
      maxFiles: 4,
      maxSizeMb: 8,
      capture: 'environment',
    },
    adapters: { files: pickerFiles },
  },
}

export const invalidConfig: UploadExample = {
  name: 'Invalid config',
  summary:
    'An `accept` entry written as a file extension rather than a MIME type. The card names it by its position and says how to write it.',
  viewportWidth: 640,
  props: {
    config: {
      folder: 'shop',
      accept: ['image/jpeg', 'jpg'],
    },
    adapters: { files: photoFiles },
  },
}

/** A stand-in composer, so the picker is seen where it belongs rather than floating on its own. */
function Composer({ props }: { props: UploadProps }) {
  const [held, setHeld] = useState<FileRef[]>([])

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <Upload.Picker {...props} onPicked={setHeld} />
      <div className="mt-2 flex items-end gap-2">
        <textarea
          rows={2}
          placeholder="Message the agent…"
          aria-label="Message the agent"
          className="min-w-0 flex-1 resize-none rounded-2xl border border-neutral-300 px-3 py-2 text-base"
        />
        <button
          type="button"
          className="shrink-0 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Send
        </button>
      </div>
      <p data-golem-composer-held="" className="mt-2 text-xs text-neutral-500">
        The composer is holding {held.length} file{held.length === 1 ? '' : 's'}.
      </p>
    </div>
  )
}

/** What an example renders. Stories and tests both go through here, so neither can drift. */
export function renderExample(example: UploadExample): ReactNode {
  if (example.surface === 'picker') return <Composer props={example.props} />
  return <Upload {...example.props} />
}

export const uploadExamples = [
  emptyZone,
  photoGallery,
  mixedList,
  withCaptions,
  uploadFails,
  pickerInComposer,
  invalidConfig,
]
