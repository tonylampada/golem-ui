import { Upload, type FilesAdapter } from 'golem-ui'
import { Screen } from '../ui'

/** The kit's `Upload` on the shop's folder: photos from the bench, invoices from the counter. */
export function Files({ files }: { files: FilesAdapter }) {
  return (
    <Screen
      title="Photos & invoices"
      lead="Dropped in from the counter or from a phone at the bench."
    >
      <Upload
        config={{
          folder: 'shop',
          accept: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
          maxFiles: 24,
          maxSizeMb: 10,
          capture: 'environment',
          captions: true,
          layout: 'grid',
          deleteAllowed: true,
          emptyState: 'Nothing on this ticket yet. Drop a photo, or take one at the bench.',
        }}
        adapters={{ files }}
      />
    </Screen>
  )
}
