const e={name:"RecordForm",slug:"record-form",storybookPath:"components-recordform",tagline:"One record being written: a create form or an edit form, from one field list.",purpose:"`RecordForm` is one record being written: a create form or an edit form of the same collection\n`RecordList` shows, out of the same field vocabulary. It owns validation, the dirty-state guard, the\nconfirm before a delete, and where an adapter's refusal lands; the fields and the layout are the\nagent's.\n\nReach for something else when the screen is many records rather than one (`RecordList`), when the\nreader signs in or is invited (`Auth`), or when nothing is written and the record is only being read\n— a page of `readOnly` fields is a form with the controls taken out, and a document is usually the\nbetter shape for that.",configNotes:["`fields` is the whole form, in the order it is drawn. Each entry starts as the field `RecordList`\nknows — `{ key, label, type, format? }` — and adds what makes a control out of it:",{table:{headings:["Key","On which types","What it does"],rows:[["`required`","all","Blocks submit while empty, and marks the label"],["`readOnly`","all","Shows the value formatted, with no control and no place in a patch"],["`help`","all","One always-visible line under the control"],["`placeholder`","all but `boolean`","Ghost text in an empty control"],["`options`","`enum` (required)","`[{ id, label }]` — the reader picks the label, the record gets the id"],["`min` / `max`","`number` `money` `date` `datetime`","The accepted range: a number, or an ISO string for a date"],["`multiline`","`text`","A textarea, spanning both columns of `two-column`"],["`users`","`user`","`members` is a select over `Identity.listMembers()`; `free` is a text box"]]}},"The eight types are the same eight `RecordList` renders, from one schema in `src/abi/fields.ts`, so\na field list can be written once and read by both."],adapters:[{adapter:"Records",calls:"`get(collection, id)`",why:"Edit mode only, to fill the controls from the record."},{adapter:"Records",calls:"`create(collection, data)`",why:"Create mode's submit. Every editable field goes in."},{adapter:"Records",calls:"`update(collection, id, patch)`",why:"Edit mode's submit. Only what the reader changed goes in."},{adapter:"Records",calls:"`remove(collection, id)`",why:"The Delete button, after the confirm."},{adapter:"Identity",calls:"`listMembers()`",why:"Only for a `user` field with `users: 'members'`."}],adapterNotes:"RecordForm takes no other adapter. It never fetches, never routes and never reads a clock — a date\nis whatever the reader put in the control, kept as an ISO string.\n\n**Which record is a prop, not config.** `mode: 'edit'` loads the id in the `recordId` prop, because\nthe route knows it and the config does not: one config serves every ticket on the board. `onDone` is\ncalled with the stored row after a save and with `null` after a delete, and `onCancel` after the\nreader has confirmed discarding anything unsaved — where those go next is the app's to decide.\n\n**Refusals name fields.** A rejection carrying `fields: [{ field, message }]` — a\n`RecordRefusedError`, or anything shaped like one — puts each sentence under its own control and\nfocuses the first. A rejection without them shows its `message` as one line above the buttons.",example:`import { RecordForm, fakeIdentity, fakeRecords } from 'golem-ui'
import 'golem-ui/styles.css'

;<RecordForm
  config={{
    collection: 'jobs',
    fields: [
      { key: 'customer', label: 'Customer', type: 'text', required: true },
      { key: 'bike', label: 'Bike', type: 'text', required: true },
      { key: 'service', label: 'Service', type: 'text', required: true },
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        required: true,
        options: [
          { id: 'waiting', label: 'Waiting for parts' },
          { id: 'in progress', label: 'On the bench' },
          { id: 'ready', label: 'Ready for pickup' },
        ],
      },
      { key: 'assignee', label: 'Mechanic', type: 'user', users: 'members' },
      { key: 'date', label: 'Booked in', type: 'date', required: true },
      { key: 'quote', label: 'Quote', type: 'money', format: 'USD', min: 0, max: 5000 },
      { key: 'approved', label: 'Price approved', type: 'boolean' },
      { key: 'notes', label: 'Notes', type: 'text', multiline: true },
    ],
    mode: 'create',
    layout: 'single',
    submitLabel: 'Book the bike in',
    cancel: 'back',
    successMessage: 'Ticket written to the board.',
  }}
  adapters={{ records: fakeRecords(), identity: fakeIdentity() }}
  onDone={(row) => navigation.go(\`/jobs/\${String(row.id)}\`)}
  onCancel={() => navigation.go('/jobs')}
/>`,failureModes:"- **Invalid config.** RecordForm renders an error card instead of the form, in dev and in prod,\n  naming every field that failed by its position — `fields.1.options` for an `enum` with nothing to\n  pick. `options` on a non-enum, a field both `required` and `readOnly`, a `min` above its `max`,\n  and `deleteAllowed` in create mode all fail the same way, before a control is drawn.\n- **Edit mode with no `recordId`** says so in place of the form. So does an id the adapter has no\n  record for: the form will not open blank and quietly create a second record.\n- **The adapter refuses.** A rejection naming fields lands under them and focuses the first; one\n  that names none is a single line above the buttons. Both take back the optimistic success line.\n- **The save is optimistic.** The success line appears before the adapter has answered, so a slow\n  store still feels immediate. A refusal takes it back — nothing is lost, but a reader who looks\n  away at the wrong moment can see the line and then the error.\n- **`readOnly` fields never reach the store.** They are not in the create data and not in the update\n  patch, so a value the server owns cannot be sent back to it stale.\n- **A `user` field with `users: 'members'` and no `Identity` adapter** draws an empty select saying\n  there are no members to pick from. The select writes the member's **name**, which is what the\n  kit's `user` type renders; store an id instead by making it an `enum` with your own options.\n- **Dates are ISO strings**, and `datetime` is a UTC instant reshaped for `datetime-local`. What the\n  reader types in the control is what the record gets, with no timezone applied on the way.\n- **Below 768px the form is one column**, whatever `layout` says, and the submit bar sticks to the\n  bottom. The breakpoint is measured on the form's own container, so a form in a narrow panel is one\n  column on a wide screen.\n- **Cancel with unsaved changes asks first.** With `cancel: 'none'` there is no cancel button and no\n  guard: a form with no way out cannot lose anything by accident.\n- **A new adapter object on every render** makes RecordForm re-load its record on every render.\n  Build adapters once, outside render."};export{e as r};
