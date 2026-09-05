import { Chat, Upload, type ChatAdapter, type FilesAdapter } from 'golem-ui'

/**
 * The kit's `Chat`, wired to the showcase's streaming adapter, with `Upload.Picker` hosted in its
 * `attach` slot — so a chip on a message is a file that really went into the shop's folder and can
 * be opened from the Files screen afterwards.
 */
export function ChatColumn({ adapter, files }: { adapter: ChatAdapter; files: FilesAdapter }) {
  return (
    <Chat
      config={{
        placeholder: 'Ask Golem…',
        emptyState: 'Ask about a ticket, a customer or today’s report.',
        agentName: 'Golem',
        userName: 'Nadia',
        showTimestamps: true,
        maxComposerLines: 6,
      }}
      adapters={{ chat: adapter }}
      attach={(stage) => (
        <Upload.Picker
          config={{
            folder: 'shop',
            accept: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
            maxFiles: 4,
            maxSizeMb: 10,
            capture: 'environment',
          }}
          adapters={{ files }}
          onPicked={(refs) =>
            stage(refs.map((ref) => ({ id: ref.id, name: ref.name, size: ref.size })))
          }
        />
      )}
    />
  )
}
