import type { FilesAdapter, StoredFile } from '../files'

export function fakeFiles(): FilesAdapter {
  const store = new Map<string, StoredFile>()
  let nextId = 1

  return {
    async upload(file: File) {
      const stored: StoredFile = {
        id: `fake-file-${nextId++}`,
        name: file.name,
        contentType: file.type,
        size: file.size,
      }
      store.set(stored.id, stored)
      return stored
    },
    async url(id: string) {
      return `https://fake.golem-ui.local/files/${id}`
    },
    async remove(id: string) {
      store.delete(id)
    },
  }
}
