import {
  fileId,
  type FileHandle,
  type FileRef,
  type FilesAdapter,
  type UploadOptions,
} from '../files'
import { createEmitter } from './emitter'

/**
 * A file already in the store when the fake is built. `content` is what `url` hands back — a data
 * URL for a seeded image — because the fake has no bytes of its own for a file nobody uploaded.
 */
export interface FakeFileSeed {
  id?: string
  folder: string
  name: string
  contentType: string
  /** Bytes, for the tile. Defaults to the length of `content`. */
  size?: number
  content?: string
  caption?: string
  /** A full ISO datetime. Defaults to the fake's `now`. */
  uploadedAt?: string
}

export interface FakeFilesOptions {
  seed?: FakeFileSeed[]
  /**
   * `upload` rejects any file with exactly this name, so the error path has somewhere to be seen.
   * Everything else in the same batch still goes up.
   */
  failOn?: string
  /** How long a fake upload takes end to end, in milliseconds. */
  uploadMs?: number
  /** What stamps `uploadedAt`, so a test is not reading the wall clock. */
  now?: () => Date
}

/** How many progress events a fake upload reports on its way up. */
const STEPS = 10

/**
 * A small stand-in picture, drawn rather than photographed: the fakes ship no image files, and a
 * gallery with nothing in it teaches nothing. It is an SVG data URL, so it costs a few hundred
 * bytes and needs no canvas, no network and no build step.
 */
export function placeholderImage(label: string, hue = 205): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="hsl(${hue} 40% 88%)"/>
<circle cx="150" cy="140" r="66" fill="hsl(${hue} 45% 74%)"/>
<circle cx="330" cy="140" r="66" fill="hsl(${hue} 45% 74%)"/>
<path d="M150 140 L215 78 L330 140" stroke="hsl(${hue} 50% 46%)" stroke-width="10" fill="none"/>
<text x="240" y="290" font-family="system-ui,sans-serif" font-size="26" text-anchor="middle" fill="hsl(${hue} 45% 32%)">${label}</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * An object URL for the blob, or a stand-in string when the platform has no `createObjectURL` —
 * jsdom does not, and a test that only checks the gallery listed a file should not fail for it.
 */
function objectUrlFor(file: File, id: string): string {
  try {
    return URL.createObjectURL(file)
  } catch {
    return `fake-file:${id}`
  }
}

/**
 * Loads the image, or gives up. Anything that does not load inside the grace period — a platform
 * that fetches no resources, a blob the decoder refuses — resolves `null`, and the caller keeps
 * the full-size URL rather than waiting on a thumbnail that is never coming.
 */
function loadImage(url: string, graceMs: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    const timer = setTimeout(() => resolve(null), graceMs)
    const settle = (value: HTMLImageElement | null) => {
      clearTimeout(timer)
      resolve(value)
    }
    image.onload = () => settle(image)
    image.onerror = () => settle(null)
    image.src = url
  })
}

/** The longest edge of a generated thumbnail, in pixels. */
const THUMB_EDGE = 160

/**
 * A thumbnail drawn from the uploaded image through a canvas, or `null` when this platform cannot
 * draw one. A real store would make it server-side; the fake makes it in the page so the grid is
 * loading small pictures rather than full ones.
 */
async function thumbnailOf(url: string, contentType: string): Promise<string | null> {
  if (!contentType.startsWith('image/')) return null
  const image = await loadImage(url, 250)
  if (!image) return null
  try {
    const scale = Math.min(1, THUMB_EDGE / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

interface Stored {
  ref: FileRef
  full: string
  thumbnail: string | null
}

/**
 * Files in memory: blobs behind object URLs, an upload that takes about 600 ms and says how far it
 * has got, a canvas thumbnail for anything that is a picture, and one name it always refuses so the
 * failure has a story of its own.
 */
export function fakeFiles(options: FakeFilesOptions = {}): FilesAdapter {
  const { failOn, uploadMs = 600, now = () => new Date() } = options
  const store = new Map<string, Stored>()
  const folders = new Map<string, ReturnType<typeof createEmitter<void>>>()
  let nextId = 1

  const emitterFor = (folder: string) => {
    let emitter = folders.get(folder)
    if (!emitter) {
      emitter = createEmitter<void>()
      folders.set(folder, emitter)
    }
    return emitter
  }

  for (const seed of options.seed ?? []) {
    const id = seed.id ?? `fake-file-${nextId++}`
    const content = seed.content ?? `fake-file:${id}`
    store.set(id, {
      ref: {
        id,
        name: seed.name,
        contentType: seed.contentType,
        size: seed.size ?? content.length,
        folder: seed.folder,
        uploadedAt: seed.uploadedAt ?? now().toISOString(),
        ...(seed.caption === undefined ? {} : { caption: seed.caption }),
      },
      full: content,
      // A seeded picture is already small, so it is its own thumbnail.
      thumbnail: seed.contentType.startsWith('image/') ? content : null,
    })
  }

  const found = (ref: FileHandle): Stored => {
    const stored = store.get(fileId(ref))
    if (!stored) throw new Error(`No file with id ${fileId(ref)} is in the store.`)
    return stored
  }

  return {
    async upload(file: File, { folder, onProgress }: UploadOptions) {
      const id = `fake-file-${nextId++}`
      const full = objectUrlFor(file, id)

      // The bar moves before the answer arrives, which is the whole point of reporting progress.
      for (let step = 1; step <= STEPS; step++) {
        await new Promise((resolve) => setTimeout(resolve, uploadMs / STEPS))
        onProgress?.(step / STEPS)
      }

      if (failOn !== undefined && file.name === failOn) {
        throw new Error(`The store rejected “${file.name}”. Nothing was saved.`)
      }

      const ref: FileRef = {
        id,
        name: file.name,
        contentType: file.type,
        size: file.size,
        folder,
        uploadedAt: now().toISOString(),
      }
      store.set(id, { ref, full, thumbnail: await thumbnailOf(full, file.type) })
      emitterFor(folder).emit()
      return ref
    },

    async url(ref: FileHandle, urlOptions?: { thumbnail?: boolean }) {
      const stored = found(ref)
      return urlOptions?.thumbnail ? (stored.thumbnail ?? stored.full) : stored.full
    },

    async remove(ref: FileHandle) {
      const stored = found(ref)
      store.delete(stored.ref.id)
      emitterFor(stored.ref.folder).emit()
    },

    async list(folder: string) {
      return [...store.values()]
        .map((stored) => stored.ref)
        .filter((ref) => ref.folder === folder)
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || b.id.localeCompare(a.id))
    },

    async caption(ref: FileHandle, caption: string) {
      const stored = found(ref)
      stored.ref = { ...stored.ref, caption }
      emitterFor(stored.ref.folder).emit()
      return stored.ref
    },

    subscribe(folder: string, listener: () => void) {
      return emitterFor(folder).subscribe(listener)
    },
  }
}
