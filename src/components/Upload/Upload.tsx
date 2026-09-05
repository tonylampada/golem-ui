import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import type { FileRef, FilesAdapter } from '../../adapters'
import { checkFile, megabytes, uploadConfigSchema, type UploadConfig } from './Upload.config'

export interface UploadAdapters {
  files: FilesAdapter
}

export interface PickerSlots {
  /**
   * Called with everything the picker is holding, every time that changes — a file finishing its
   * upload, or a chip being taken off. The parent composer keeps the list; the picker only shows it.
   */
  onPicked?: (refs: FileRef[]) => void
}

/** One file on its way up, or one that did not make it. */
interface QueueItem {
  key: string
  name: string
  size: number
  /** 0 to 1. Stays at 0 for a file refused before the upload started. */
  progress: number
  error: string | null
}

const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))

/** What tiles a file that is not a picture. Type first, then the extension. */
function iconFor(contentType: string, name: string): string {
  if (contentType.startsWith('image/')) return '🖼'
  if (contentType.startsWith('audio/')) return '🎧'
  if (contentType.startsWith('video/')) return '🎬'
  if (contentType === 'application/pdf' || name.endsWith('.pdf')) return '📄'
  return '📎'
}

const isImage = (ref: FileRef) => ref.contentType.startsWith('image/')

/**
 * The upload queue: what the reader picked, what the limits said about it, and how far up each one
 * has got. Both surfaces run on this, so a file is refused for the same reason and with the same
 * sentence whether it was picked in a gallery or in a composer.
 */
function useQueue(
  files: FilesAdapter,
  config: UploadConfig,
  onUploaded: (ref: FileRef) => void,
  held: () => number,
) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const nextKey = useRef(0)

  const dismiss = useCallback((key: string) => {
    setQueue((rows) => rows.filter((row) => row.key !== key))
  }, [])

  const add = useCallback(
    (picked: File[]) => {
      // Where in the folder each of these would land, so the count limit names the right file.
      let position = held()

      for (const file of picked) {
        const key = `q-${nextKey.current++}`
        position += 1
        const refusal = checkFile(file, config, position)

        setQueue((rows) => [
          ...rows,
          {
            key,
            name: file.name,
            size: file.size,
            progress: 0,
            error: refusal ? refusal.message : null,
          },
        ])

        // A refused file never reaches the adapter: the limit is enforced here, on this machine.
        if (refusal) {
          position -= 1
          continue
        }

        const advance = (fraction: number) =>
          setQueue((rows) =>
            rows.map((row) => (row.key === key ? { ...row, progress: fraction } : row)),
          )

        void files.upload(file, { folder: config.folder, onProgress: advance }).then(
          (ref) => {
            // The file has left the queue for the gallery; keeping a finished row would say it
            // is still in flight.
            dismiss(key)
            onUploaded(ref)
          },
          (cause: unknown) => {
            setQueue((rows) =>
              rows.map((row) => (row.key === key ? { ...row, error: message(cause) } : row)),
            )
          },
        )
      }
    },
    [files, config, onUploaded, held, dismiss],
  )

  return { queue, add, dismiss }
}

interface GalleryUrls {
  full: string
  thumbnail: string
}

/** What is in the folder, and the URLs to draw it with. Nothing polls; `subscribe` re-lists. */
function useGallery(files: FilesAdapter, folder: string) {
  const [refs, setRefs] = useState<FileRef[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // `null` is a file whose URL the store refused, told apart from one not asked for yet, so a
  // thumbnail that will never arrive tiles as an icon instead of an empty frame.
  const [urls, setUrls] = useState<Record<string, GalleryUrls | null>>({})

  useEffect(() => {
    let live = true
    const refresh = () => {
      void files.list(folder).then(
        (found) => {
          if (!live) return
          setRefs(found)
          setError(null)
        },
        (cause: unknown) => {
          if (!live) return
          setRefs([])
          setError(message(cause))
        },
      )
    }
    refresh()
    const unsubscribe = files.subscribe(folder, refresh)
    return () => {
      live = false
      unsubscribe()
    }
  }, [files, folder])

  // One pair of URLs per file, resolved once. A file that has gone keeps its entry until unmount,
  // which costs a map entry and saves re-resolving a file that comes back.
  useEffect(() => {
    let live = true
    for (const ref of refs ?? []) {
      if (ref.id in urls) continue
      void Promise.all([files.url(ref, { thumbnail: true }), files.url(ref)]).then(
        ([thumbnail, full]) => {
          if (live) setUrls((current) => ({ ...current, [ref.id]: { full, thumbnail } }))
        },
        () => {
          if (live) setUrls((current) => ({ ...current, [ref.id]: null }))
        },
      )
    }
    return () => {
      live = false
    }
  }, [refs, files, urls])

  return { refs, error, urls }
}

function ProgressBar({ fraction }: { fraction: number }) {
  const percent = Math.round(fraction * 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
    >
      <div
        style={{ width: `${percent}%` }}
        className="h-full rounded-full bg-neutral-900 transition-[width] duration-150"
      />
    </div>
  )
}

function Queue({ rows, onDismiss }: { rows: QueueItem[]; onDismiss: (key: string) => void }) {
  if (rows.length === 0) return null
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((row) => (
        <li
          key={row.key}
          data-golem-queue-item={row.name}
          className={`rounded-lg border p-2.5 ${
            row.error === null ? 'border-neutral-200 bg-white' : 'border-red-300 bg-red-50'
          }`}
        >
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
            <span className="shrink-0 text-xs text-neutral-500">
              {row.error === null ? `${Math.round(row.progress * 100)}%` : megabytes(row.size)}
            </span>
            <button
              type="button"
              onClick={() => onDismiss(row.key)}
              aria-label={`Dismiss ${row.name}`}
              className="shrink-0 text-neutral-400 hover:text-neutral-700"
            >
              ×
            </button>
          </div>
          {row.error === null ? (
            <ProgressBar fraction={row.progress} />
          ) : (
            <p role="alert" className="mt-1 text-xs text-red-800">
              {row.error}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * The three ways a file gets in: dropped on the zone, chosen from the file picker, or taken with
 * the camera. All three land in the same `add`.
 */
function DropZone({
  config,
  onFiles,
}: {
  config: UploadConfig
  onFiles: (picked: File[]) => void
}) {
  const [over, setOver] = useState(false)
  const chooser = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)

  const accept = config.accept.join(',')
  const take = (list: FileList | null) => onFiles([...(list ?? [])])

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setOver(false)
    take(event.dataTransfer.files)
  }

  return (
    <div
      data-golem-dropzone=""
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`rounded-xl border-2 border-dashed p-5 text-center ${
        over ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-300 bg-white'
      }`}
    >
      <p className="text-sm text-neutral-600">Drop files here, or pick them from this device.</p>
      <p className="mt-1 text-xs text-neutral-400">
        Up to {config.maxFiles} files, {config.maxSizeMb} MB each
        {config.accept.length > 0 ? ` · ${config.accept.join(', ')}` : ''}
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => chooser.current?.click()}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Choose files
        </button>
        {config.capture !== 'off' && (
          <button
            type="button"
            onClick={() => camera.current?.click()}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium"
          >
            📷 Take a photo
          </button>
        )}
      </div>

      <input
        ref={chooser}
        type="file"
        multiple
        accept={accept || undefined}
        aria-label="Choose files"
        className="hidden"
        onChange={(event) => {
          take(event.target.files)
          event.target.value = ''
        }}
      />
      {config.capture !== 'off' && (
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture={config.capture}
          aria-label="Take a photo"
          className="hidden"
          onChange={(event) => {
            take(event.target.files)
            event.target.value = ''
          }}
        />
      )}
    </div>
  )
}

function Caption({ file, files }: { file: FileRef; files: FilesAdapter }) {
  const [text, setText] = useState(file.caption ?? '')

  return (
    <input
      value={text}
      onChange={(event) => setText(event.target.value)}
      // Saved when the reader leaves the box, not on every keystroke: a caption is a sentence.
      onBlur={() => {
        if (text !== (file.caption ?? '')) void files.caption(file, text)
      }}
      placeholder="Add a caption"
      aria-label={`Caption for ${file.name}`}
      className="mt-1.5 w-full rounded border border-neutral-200 px-2 py-1 text-xs"
    />
  )
}

function DeleteButton({
  file,
  files,
  onDeleted,
}: {
  file: FileRef
  files: FilesAdapter
  onDeleted: () => void
}) {
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="text-xs font-medium text-neutral-500 hover:text-red-700"
      >
        Delete
      </button>
    )
  }

  return (
    <span role="alertdialog" aria-label={`Delete ${file.name}?`} className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          void files.remove(file).then(onDeleted, (cause: unknown) => setError(message(cause)))
        }}
        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white"
      >
        Delete permanently
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium"
      >
        Keep it
      </button>
      {error !== null && (
        <span role="alert" className="text-xs text-red-800">
          {error}
        </span>
      )}
    </span>
  )
}

function Lightbox({
  file,
  url,
  onClose,
}: {
  file: FileRef
  url: string | undefined
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-label={file.name}
      data-golem-lightbox={file.name}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-4"
    >
      {isImage(file) && url ? (
        <img
          src={url}
          alt={file.caption ?? file.name}
          onClick={(event) => event.stopPropagation()}
          className="max-h-[75vh] max-w-full rounded-lg bg-white object-contain"
        />
      ) : (
        <div
          onClick={(event) => event.stopPropagation()}
          className="rounded-xl bg-white p-6 text-center"
        >
          <p className="text-4xl">{iconFor(file.contentType, file.name)}</p>
          <p className="mt-2 text-sm font-medium">{file.name}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {file.contentType || 'unknown type'} · {megabytes(file.size)}
          </p>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium underline"
            >
              Open it
            </a>
          )}
        </div>
      )}
      <p className="max-w-full truncate text-sm text-white">{file.caption ?? file.name}</p>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium"
      >
        Close
      </button>
    </div>
  )
}

function Gallery({
  config,
  files,
  refs,
  urls,
}: {
  config: UploadConfig
  files: FilesAdapter
  refs: FileRef[]
  urls: Record<string, GalleryUrls | null>
}) {
  const [open, setOpen] = useState<string | null>(null)
  const openFile = refs.find((ref) => ref.id === open)

  const grid = config.layout === 'grid'
  // A picture the store gave us no URL for is drawn as its icon: an empty frame would say the
  // file is blank rather than that the thumbnail did not arrive.
  const asPicture = (file: FileRef) => isImage(file) && urls[file.id] !== null

  const tile = (file: FileRef) => (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen(file.id)}
        aria-label={`Open ${file.name}`}
        className="block w-full text-left"
      >
        {grid ? (
          // Every tile is the same square, picture or not, so a row of the grid is one line high.
          <span className="block aspect-square overflow-hidden rounded-lg bg-neutral-100">
            {asPicture(file) ? (
              urls[file.id] && (
                <img
                  src={urls[file.id]!.thumbnail}
                  alt={file.caption ?? file.name}
                  className="size-full object-cover"
                />
              )
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-1">
                <span className="text-3xl leading-none">
                  {iconFor(file.contentType, file.name)}
                </span>
                <span className="text-xs text-neutral-500">{megabytes(file.size)}</span>
              </span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-2xl leading-none">{iconFor(file.contentType, file.name)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{file.name}</span>
              <span className="block text-xs text-neutral-500">{megabytes(file.size)}</span>
            </span>
          </span>
        )}
      </button>

      {grid && <p className="mt-1 truncate text-xs text-neutral-600">{file.name}</p>}
      {config.captions && <Caption file={file} files={files} />}
    </div>
  )

  return (
    <>
      <ul
        className={
          config.layout === 'grid'
            ? 'mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'
            : 'mt-4 space-y-2'
        }
      >
        {refs.map((file) => (
          <li
            key={file.id}
            data-golem-file={file.id}
            className={`rounded-xl border border-neutral-200 bg-white p-2 ${
              config.layout === 'list' ? 'flex items-center gap-3' : ''
            }`}
          >
            {tile(file)}
            {config.deleteAllowed && (
              <div className={config.layout === 'list' ? 'shrink-0' : 'mt-1'}>
                <DeleteButton
                  file={file}
                  files={files}
                  onDeleted={() => setOpen((id) => (id === file.id ? null : id))}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {openFile && (
        <Lightbox file={openFile} url={urls[openFile.id]?.full} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

function UploadPanel({ config, adapters }: GolemProps<UploadConfig, UploadAdapters>) {
  const { refs, error, urls } = useGallery(adapters.files, config.folder)

  // The count limit is about the folder, so what is already in the gallery counts towards it.
  const countHeld = useCallback(() => refs?.length ?? 0, [refs])
  const noop = useCallback(() => {}, [])

  const { queue, add, dismiss } = useQueue(adapters.files, config, noop, countHeld)

  let body: ReactNode
  if (refs === null) {
    body = <p className="mt-6 text-center text-sm text-neutral-500">Loading…</p>
  } else if (error !== null) {
    body = (
      <p role="alert" className="mt-6 text-center text-sm text-red-900">
        {error}
      </p>
    )
  } else if (refs.length === 0) {
    body = <p className="mt-6 text-center text-sm text-neutral-500">{config.emptyState}</p>
  } else {
    body = <Gallery config={config} files={adapters.files} refs={refs} urls={urls} />
  }

  return (
    <div data-golem-component="Upload" className="golem-upload w-full text-neutral-900">
      <DropZone config={config} onFiles={add} />
      <Queue rows={queue} onDismiss={dismiss} />
      {body}
    </div>
  )
}

function PickerButton({
  config,
  adapters,
  onPicked,
}: GolemProps<UploadConfig, UploadAdapters, PickerSlots>) {
  const [picked, setPicked] = useState<FileRef[]>([])
  const input = useRef<HTMLInputElement>(null)

  // The parent hears about the list, never about the change: one place to report from, and the
  // callback is read out of a ref so a composer that writes its slot inline does not re-report on
  // every render of the composer.
  const report = useRef(onPicked)
  useEffect(() => {
    report.current = onPicked
  })
  useEffect(() => {
    report.current?.(picked)
  }, [picked])

  const onUploaded = useCallback((ref: FileRef) => setPicked((held) => [...held, ref]), [])
  const countHeld = useCallback(() => picked.length, [picked])

  const { queue, add, dismiss } = useQueue(adapters.files, config, onUploaded, countHeld)

  return (
    <div data-golem-component="Upload.Picker" className="golem-upload-picker w-full">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm"
        >
          📎 Attach
        </button>
        {picked.map((file) => (
          <span
            key={file.id}
            data-golem-picker-chip={file.name}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs"
          >
            <span aria-hidden="true">{iconFor(file.contentType, file.name)}</span>
            <span className="truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => setPicked((held) => held.filter((one) => one.id !== file.id))}
              aria-label={`Remove ${file.name}`}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <Queue rows={queue} onDismiss={dismiss} />

      <input
        ref={input}
        type="file"
        multiple
        accept={config.accept.join(',') || undefined}
        capture={config.capture === 'off' ? undefined : config.capture}
        aria-label="Attach files"
        className="hidden"
        onChange={(event) => {
          add([...(event.target.files ?? [])])
          event.target.value = ''
        }}
      />
    </div>
  )
}

const UploadComponent = defineComponent<typeof uploadConfigSchema, UploadAdapters>({
  name: 'Upload',
  schema: uploadConfigSchema,
  render: UploadPanel,
})

const Picker = defineComponent<typeof uploadConfigSchema, UploadAdapters, PickerSlots>({
  name: 'Upload.Picker',
  schema: uploadConfigSchema,
  render: PickerButton,
})

/**
 * Two surfaces on one config. `Upload` is the whole thing — a place to drop files, a queue while
 * they go up, and the gallery they land in. `Upload.Picker` is the same picking and the same
 * limits with no gallery: a button a composer hosts, handing the file refs back to whatever is
 * about to send them.
 */
export const Upload = Object.assign(UploadComponent, { Picker })
