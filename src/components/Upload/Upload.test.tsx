import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeFiles } from '../../adapters/fake'
import type { FilesAdapter } from '../../adapters'
import { Upload } from './Upload'
import * as examples from './Upload.examples'
import type { UploadConfigInput } from './Upload.config'

/** Lets the adapter's `list()` promise land, so no state update escapes `act`. */
const flush = () => act(async () => {})

/** A file of a given size without allocating it: only `size`, `type` and `name` are ever read. */
function fileOf(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const config = (over: Partial<UploadConfigInput> = {}): UploadConfigInput => ({
  folder: 'shop',
  accept: ['image/jpeg', 'image/png'],
  maxSizeMb: 2,
  ...over,
})

function mount(over: Partial<UploadConfigInput> = {}, adapter?: FilesAdapter) {
  const files = adapter ?? fakeFiles({ uploadMs: 40 })
  const view = render(<Upload config={config(over)} adapters={{ files }} />)
  return { files, view }
}

const choose = (label: string, ...uploaded: File[]) =>
  userEvent.upload(screen.getByLabelText(label), uploaded)

const tileIds = () =>
  Array.from(document.querySelectorAll('[data-golem-file]')).map(
    (tile) => tile.getAttribute('data-golem-file') ?? '',
  )

describe('Upload', () => {
  it('renders every documented example without crashing', async () => {
    for (const example of examples.uploadExamples) {
      const { unmount } = render(examples.renderExample(example))
      await flush()
      unmount()
    }
  })

  it('refuses an over-size file without calling upload, and takes the rest of the batch', async () => {
    const files = fakeFiles({ uploadMs: 20 })
    const upload = vi.spyOn(files, 'upload')
    mount({ maxSizeMb: 2 }, files)
    await flush()

    await choose(
      'Choose files',
      fileOf('huge.jpg', 'image/jpeg', 5 * 1024 * 1024),
      fileOf('small.jpg', 'image/jpeg', 4096),
    )

    const row = await screen.findByText(/“huge.jpg” is 5.0 MB. The limit is 2 MB./)
    expect(row).toBeInTheDocument()
    // The limit is enforced here: the big file never left the machine.
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1))
    expect(upload.mock.calls[0]![0]!.name).toBe('small.jpg')
  })

  it('refuses a dropped file whose type `accept` does not cover', async () => {
    // Dropped rather than chosen: the file picker already filters by `accept`, so a wrong type only
    // ever arrives by drag and drop, and that is the path the limit has to hold.
    const files = fakeFiles({ uploadMs: 20 })
    const upload = vi.spyOn(files, 'upload')
    mount({ accept: ['image/jpeg'] }, files)
    await flush()

    fireEvent.drop(document.querySelector('[data-golem-dropzone]')!, {
      dataTransfer: { files: [fileOf('quote.pdf', 'application/pdf', 2048)] },
    })

    expect(
      await screen.findByText(/“quote.pdf” is application\/pdf. This upload takes image\/jpeg./),
    ).toBeInTheDocument()
    expect(upload).not.toHaveBeenCalled()
  })

  it('moves the progress bar on the row as the adapter reports it', async () => {
    // A store that reports progress by hand, so the assertion is about the row and not about timing.
    let report: ((fraction: number) => void) | undefined
    const files: FilesAdapter = {
      ...fakeFiles(),
      upload(_file, options) {
        report = options.onProgress
        return new Promise(() => {})
      },
    }
    mount({}, files)
    await flush()

    await choose('Choose files', fileOf('wheel.jpg', 'image/jpeg', 4096))
    const row = await screen.findByText('wheel.jpg')
    expect(row.closest('li')!.querySelector('[role="progressbar"]')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )

    await act(async () => report!(0.4))
    expect(row.closest('li')!.querySelector('[role="progressbar"]')).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
    expect(row.closest('li')).toHaveTextContent('40%')
  })

  it('shows the store’s refusal on the row that failed and keeps the others going', async () => {
    const files = fakeFiles({ uploadMs: 20, failOn: 'dark.jpg' })
    mount({}, files)
    await flush()

    await choose(
      'Choose files',
      fileOf('dark.jpg', 'image/jpeg', 4096),
      fileOf('bright.jpg', 'image/jpeg', 4096),
    )

    expect(await screen.findByText(/The store rejected “dark.jpg”/)).toBeInTheDocument()
    // The other file went up: it left the queue and is in the gallery.
    await waitFor(() => expect(tileIds()).toHaveLength(1))
    expect(screen.getByText('bright.jpg')).toBeInTheDocument()
  })

  it('shows a file put in the folder by something else, through subscribe', async () => {
    const files = fakeFiles({ uploadMs: 10 })
    mount({ layout: 'list' }, files)
    await flush()
    expect(screen.getByText('No files yet.')).toBeInTheDocument()

    await act(async () => {
      await files.upload(fileOf('counter-photo.jpg', 'image/jpeg', 4096), { folder: 'shop' })
    })

    await waitFor(() => expect(screen.getByText('counter-photo.jpg')).toBeInTheDocument())
  })

  it('asks before it deletes, and only calls remove once the reader has said so', async () => {
    const files = fakeFiles({ seed: examples.shopPhotos.slice(0, 2), uploadMs: 10 })
    const remove = vi.spyOn(files, 'remove')
    mount({ layout: 'list' }, files)
    await flush()
    expect(tileIds()).toEqual(['f-1', 'f-3'])

    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]!)
    expect(remove).not.toHaveBeenCalled()

    // Backing out leaves the file where it is.
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(remove).not.toHaveBeenCalled()
    expect(tileIds()).toEqual(['f-1', 'f-3'])

    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]!)
    await userEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
    await waitFor(() => expect(tileIds()).toEqual(['f-3']))
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('never offers a delete button with deleteAllowed off', async () => {
    mount({ deleteAllowed: false, layout: 'list' }, fakeFiles({ seed: examples.shopPhotos }))
    await flush()

    expect(tileIds()).toHaveLength(4)
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('opens a file in the lightbox and closes it again', async () => {
    mount({}, fakeFiles({ seed: examples.shopPhotos.slice(0, 1) }))
    await flush()

    await userEvent.click(screen.getByRole('button', { name: 'Open rove-rear-wheel-before.jpg' }))
    expect(screen.getByRole('dialog', { name: 'rove-rear-wheel-before.jpg' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('hands the parent every ref the picker is holding', async () => {
    const files = fakeFiles({ uploadMs: 20 })
    const onPicked = vi.fn()
    render(
      <Upload.Picker
        config={config({ folder: 'chat', maxFiles: 4 })}
        adapters={{ files }}
        onPicked={onPicked}
      />,
    )

    await choose('Attach files', fileOf('fork.jpg', 'image/jpeg', 4096))

    // The parent is told the whole list, so it hears the empty one on mount before the first pick.
    await waitFor(() => expect(onPicked.mock.calls.at(-1)![0]).toHaveLength(1))
    const picked = onPicked.mock.calls.at(-1)![0] as { name: string; folder: string }[]
    expect(picked[0]!.name).toBe('fork.jpg')
    expect(picked[0]!.folder).toBe('chat')
    expect(screen.getByText('fork.jpg')).toBeInTheDocument()

    // Taking the chip off tells the parent too, so the two never disagree.
    await userEvent.click(screen.getByRole('button', { name: 'Remove fork.jpg' }))
    await waitFor(() => expect(onPicked.mock.calls.at(-1)![0]).toEqual([]))
  })

  it('renders an error card naming the accept entry that is not a MIME type', () => {
    render(<Upload {...examples.invalidConfig.props} />)

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('accept.1')
    expect(card).toHaveTextContent('"jpg" is not a MIME type')
    expect(document.querySelector('[data-golem-dropzone]')).not.toBeInTheDocument()
  })
})
