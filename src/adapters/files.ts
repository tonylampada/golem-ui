import type { Unsubscribe } from './common'

/**
 * A stored file, as everything downstream refers to it. Plain JSON: an agent can put one in a
 * record, a chat message or a config and it survives the round trip. It carries no bytes — the
 * bytes are behind `url`.
 */
export interface FileRef {
  id: string
  /** The name it was uploaded under, extension included. */
  name: string
  /** The MIME type it is stored as, e.g. `image/jpeg`. A gallery reads it to know it has a photo. */
  contentType: string
  /** Bytes. */
  size: number
  /** The folder it lives in: the same string `upload` and `list` are given. */
  folder: string
  /** The instant the store accepted it, as a full ISO datetime. */
  uploadedAt: string
  /** One line the reader wrote under it. Absent until something captions it. */
  caption?: string
}

export interface UploadOptions {
  /** Where the file lands, and where `list` and `subscribe` will find it again. */
  folder: string
  /**
   * Called as the bytes go up, with the fraction done between 0 and 1. A store that cannot report
   * progress calls it once with 1 rather than never — the caller draws a bar either way.
   */
  onProgress?: (fraction: number) => void
}

/**
 * A stored file, or just its id. A caller that kept only the id — an attachment on a record, say —
 * can still open and delete the file without having the whole ref to hand.
 */
export type FileHandle = FileRef | string

export const fileId = (ref: FileHandle): string => (typeof ref === 'string' ? ref : ref.id)

/**
 * Files is a folder of blobs and the four things you do to one: put it there, open it, caption it,
 * take it away. Every method that can be refused rejects with an `Error` whose `message` is shown
 * to the reader as it is written.
 */
export interface FilesAdapter {
  upload(file: File, options: UploadOptions): Promise<FileRef>
  /**
   * A URL to open. `thumbnail` asks for a small one; a store that keeps no thumbnail returns the
   * full URL, so a caller never has to ask whether it has one.
   */
  url(ref: FileHandle, options?: { thumbnail?: boolean }): Promise<string>
  remove(ref: FileHandle): Promise<void>
  /** Everything in the folder, newest first. */
  list(folder: string): Promise<FileRef[]>
  /** Writes the caption on a stored file and returns the whole ref back. */
  caption(ref: FileHandle, caption: string): Promise<FileRef>
  /** Called with no argument whenever the folder changed; the caller re-lists. */
  subscribe(folder: string, listener: () => void): Unsubscribe
}
