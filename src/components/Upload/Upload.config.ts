import { z } from 'zod'

/** `type/subtype`, where the subtype may be `*`. What `accept` is checked against. */
const MIME = /^[a-z]+\/[a-z0-9!#$&^_.+-]+$|^[a-z]+\/\*$/

export const uploadConfigSchema = z
  .object({
    folder: z
      .string()
      .min(1)
      .describe(
        'Where the files live, passed to `upload`, `list` and `subscribe`. One folder is one gallery; two Uploads on the same folder show the same files.',
      ),
    accept: z
      .array(z.string().min(1))
      .default([])
      .describe(
        'The MIME types the picker offers and the component lets through, as `image/jpeg` or `image/*`. Empty accepts anything. A file of any other type is refused before it is uploaded.',
      ),
    maxFiles: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(20)
      .describe(
        'How many files the folder may hold. Everything already in the gallery counts, so the last pick is the one refused.',
      ),
    maxSizeMb: z
      .number()
      .positive()
      .max(2048)
      .default(10)
      .describe(
        'The largest file accepted, in megabytes. It is checked in the browser before `upload` is called, so an over-size file never leaves the machine.',
      ),
    capture: z
      .enum(['environment', 'user', 'off'])
      .default('off')
      .describe(
        'Whether a phone gets a camera button beside the file button: `environment` opens the rear camera, `user` the front one, `off` shows no camera button. A desktop browser ignores it and offers the file picker.',
      ),
    captions: z
      .boolean()
      .default(false)
      .describe(
        'Whether each file carries one line of the reader’s own words, written under the tile and saved through `Files.caption`.',
      ),
    layout: z
      .enum(['grid', 'list'])
      .default('grid')
      .describe(
        'How the gallery reads: `grid` is thumbnails, for a folder of photos; `list` is one row per file with its icon, name and size, for a folder of documents.',
      ),
    deleteAllowed: z
      .boolean()
      .default(true)
      .describe(
        'Whether a file can be deleted from the gallery. Off hides every delete button; the component never calls `Files.remove`.',
      ),
    emptyState: z
      .string()
      .min(1)
      .default('No files yet.')
      .describe('One line shown in place of the gallery while the folder is empty.'),
  })
  .strict()
  .superRefine((config, ctx) => {
    for (const [index, type] of config.accept.entries()) {
      if (!MIME.test(type)) {
        ctx.addIssue({
          code: 'custom',
          path: ['accept', index],
          message: `"${type}" is not a MIME type, so no file can ever match it. Write it as type/subtype: image/jpeg, application/pdf, image/*.`,
        })
      }
    }
  })

export type UploadConfig = z.output<typeof uploadConfigSchema>
export type UploadConfigInput = z.input<typeof uploadConfigSchema>

/** Why a file was turned away before anything was uploaded. */
export type RejectionReason = 'size' | 'type' | 'count'

/**
 * A file the component refused on its own, without asking the adapter. It is thrown nowhere: the
 * component catches its own limits and shows the `message` on the file's row, which is where the
 * reader can do something about it.
 */
export class FileRejectedError extends Error {
  readonly fileName: string
  readonly reason: RejectionReason

  constructor(fileName: string, reason: RejectionReason, message: string) {
    super(message)
    this.name = 'FileRejectedError'
    this.fileName = fileName
    this.reason = reason
  }
}

const MB = 1024 * 1024

export function megabytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / MB).toFixed(1)} MB`
}

/** Whether the type is one the `accept` list lets through. An empty list lets everything through. */
export function accepts(accept: string[], contentType: string): boolean {
  if (accept.length === 0) return true
  const [group, sub] = contentType.split('/')
  return accept.some((entry) => {
    const [wantGroup, wantSub] = entry.split('/')
    return wantGroup === group && (wantSub === '*' || wantSub === sub)
  })
}

/**
 * The three limits, checked in the order a reader would ask about them: is it the right kind of
 * thing, is it small enough, is there room. Returns the refusal, or `null` when the file may go up.
 * `position` is what number this file would be in the folder, counting from one.
 */
export function checkFile(
  file: { name: string; size: number; type: string },
  config: UploadConfig,
  position: number,
): FileRejectedError | null {
  if (!accepts(config.accept, file.type)) {
    return new FileRejectedError(
      file.name,
      'type',
      `“${file.name}” is ${file.type || 'of no known type'}. This upload takes ${config.accept.join(', ')}.`,
    )
  }
  if (file.size > config.maxSizeMb * MB) {
    return new FileRejectedError(
      file.name,
      'size',
      `“${file.name}” is ${megabytes(file.size)}. The limit is ${config.maxSizeMb} MB.`,
    )
  }
  if (position > config.maxFiles) {
    return new FileRejectedError(
      file.name,
      'count',
      `“${file.name}” would be file ${position}. This upload holds ${config.maxFiles}.`,
    )
  }
  return null
}
