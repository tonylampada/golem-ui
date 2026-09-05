export interface StoredFile {
  id: string
  name: string
  contentType: string
  size: number
}

export interface FilesAdapter {
  upload(file: File): Promise<StoredFile>
  url(id: string): Promise<string>
  remove(id: string): Promise<void>
}
