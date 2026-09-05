import type { GolemProps } from '../../abi'
import { fakeIdentity, fakeRecords } from '../../adapters/fake'
import type { RecordFormAdapters, RecordFormSlots } from './RecordForm'
import type { RecordFormConfigInput } from './RecordForm.config'

export type RecordFormProps = GolemProps<RecordFormConfigInput, RecordFormAdapters, RecordFormSlots>

export interface RecordFormExample {
  name: string
  summary: string
  props: RecordFormProps
  /** Under 768 the form is one column with a sticky bar. The story frames it at this width. */
  viewportWidth: number
}

/**
 * Adapters are built once, at module load, so props identity is stable: a form handed a new
 * adapter on every render would re-load its record on every render.
 *
 * The record is a repair ticket at Northgate Cycles, the invented bike shop the showcase is set in.
 */

export const mechanics = [
  { id: 'u-nadia', name: 'Nadia Kessler', roles: ['owner'] },
  { id: 'u-omar', name: 'Omar Bright', roles: ['mechanic'] },
  { id: 'u-priya', name: 'Priya Sandoval', roles: ['mechanic'] },
]

export const ticket = {
  id: 'j-4187',
  ticket: '#4187',
  customer: 'Delia Marchetti',
  bike: 'Kona Rove, 2019',
  service: 'Rear wheel rebuild',
  status: 'in progress',
  assignee: 'Nadia Kessler',
  date: '2026-09-10',
  quote: 140,
  approved: true,
  notes: 'Drive-side spokes replaced; waiting on a rim tape order.',
}

export const STATUS_OPTIONS = [
  { id: 'waiting', label: 'Waiting for parts' },
  { id: 'in progress', label: 'On the bench' },
  { id: 'ready', label: 'Ready for pickup' },
]

/** Every control the form can draw, in one field list. */
export const ticketFields: RecordFormConfigInput['fields'] = [
  {
    key: 'customer',
    label: 'Customer',
    type: 'text',
    required: true,
    placeholder: 'Delia Marchetti',
  },
  { key: 'bike', label: 'Bike', type: 'text', required: true, placeholder: 'Kona Rove, 2019' },
  {
    key: 'service',
    label: 'Service',
    type: 'text',
    required: true,
    help: 'What the bike is in for, in a few words.',
  },
  { key: 'status', label: 'Status', type: 'enum', required: true, options: STATUS_OPTIONS },
  { key: 'assignee', label: 'Mechanic', type: 'user', users: 'members' },
  { key: 'date', label: 'Booked in', type: 'date', required: true, min: '2026-01-01' },
  {
    key: 'quote',
    label: 'Quote',
    type: 'money',
    format: 'USD',
    min: 0,
    max: 5000,
    help: 'What the shop told the customer. Over $500 needs the owner.',
  },
  { key: 'approved', label: 'Price approved', type: 'boolean' },
  { key: 'notes', label: 'Notes', type: 'text', multiline: true, placeholder: 'What you found.' },
]

const identity = fakeIdentity({ members: mechanics })

const createAdapters: RecordFormAdapters = { records: fakeRecords({ jobs: [] }), identity }
const editAdapters: RecordFormAdapters = { records: fakeRecords({ jobs: [ticket] }), identity }
const deleteAdapters: RecordFormAdapters = { records: fakeRecords({ jobs: [ticket] }), identity }
const readOnlyAdapters: RecordFormAdapters = { records: fakeRecords({ jobs: [ticket] }), identity }

/** A store that refuses every write, naming the field the refusal belongs to. */
const refusingAdapters: RecordFormAdapters = {
  records: fakeRecords(
    { jobs: [ticket] },
    { refuse: { field: 'quote', message: 'A quote over $500 needs the owner to sign it off.' } },
  ),
  identity,
}

const createConfig: RecordFormConfigInput = {
  collection: 'jobs',
  fields: ticketFields,
  mode: 'create',
  layout: 'single',
  submitLabel: 'Book the bike in',
  cancel: 'back',
  successMessage: 'Ticket written to the board.',
}

const editConfig: RecordFormConfigInput = {
  ...createConfig,
  mode: 'edit',
  layout: 'two-column',
  submitLabel: 'Save the ticket',
  successMessage: 'Ticket updated.',
}

export const createPhone: RecordFormExample = {
  name: 'Create on a phone',
  summary:
    'A blank ticket at 390px: one column, and the submit bar stuck to the bottom. Submit with the customer empty and the first invalid control takes focus.',
  viewportWidth: 390,
  props: { config: createConfig, adapters: createAdapters },
}

export const createDesktop: RecordFormExample = {
  name: 'Create, two columns',
  summary:
    'The same fields with `layout: "two-column"` above 768px. The multiline note spans both columns.',
  viewportWidth: 900,
  props: {
    config: { ...createConfig, layout: 'two-column' },
    adapters: createAdapters,
  },
}

export const edit: RecordFormExample = {
  name: 'Edit',
  summary:
    'Edit mode loads ticket `j-4187` through `get` and fills every control from it. Change anything and the bar says there are unsaved changes.',
  viewportWidth: 900,
  props: { config: editConfig, adapters: editAdapters, recordId: 'j-4187' },
}

export const refused: RecordFormExample = {
  name: 'The adapter refuses',
  summary:
    'A store that rejects every write with a `RecordRefusedError` naming `quote`. Submit and the sentence lands under the quote control, not at the top of the page.',
  viewportWidth: 900,
  props: { config: editConfig, adapters: refusingAdapters, recordId: 'j-4187' },
}

export const readOnlyFields: RecordFormExample = {
  name: 'Read-only fields',
  summary:
    'The ticket number, the customer and the booking date belong to the store, so they are shown formatted with no control and stay out of the patch.',
  viewportWidth: 900,
  props: {
    config: {
      ...editConfig,
      fields: [
        { key: 'ticket', label: 'Ticket', type: 'text', readOnly: true },
        { key: 'customer', label: 'Customer', type: 'text', readOnly: true },
        { key: 'date', label: 'Booked in', type: 'date', format: 'medium', readOnly: true },
        { key: 'status', label: 'Status', type: 'enum', required: true, options: STATUS_OPTIONS },
        { key: 'quote', label: 'Quote', type: 'money', format: 'USD', min: 0 },
        { key: 'notes', label: 'Notes', type: 'text', multiline: true },
      ],
    },
    adapters: readOnlyAdapters,
    recordId: 'j-4187',
  },
}

export const deletable: RecordFormExample = {
  name: 'Delete with a confirm',
  summary:
    '`deleteAllowed: true` adds a Delete button that asks once before calling `remove`. Cancel with unsaved changes asks the same way.',
  viewportWidth: 900,
  props: {
    config: { ...editConfig, deleteAllowed: true },
    adapters: deleteAdapters,
    recordId: 'j-4187',
  },
}

export const invalidConfig: RecordFormExample = {
  name: 'Invalid config',
  summary:
    'An enum field with no `options`, so there is nothing to pick. The card names the entry by its position.',
  viewportWidth: 900,
  props: {
    config: {
      collection: 'jobs',
      mode: 'create',
      fields: [
        { key: 'customer', label: 'Customer', type: 'text', required: true },
        { key: 'status', label: 'Status', type: 'enum' },
      ],
    },
    adapters: createAdapters,
  },
}

export const recordFormExamples = [
  createPhone,
  createDesktop,
  edit,
  refused,
  readOnlyFields,
  deletable,
  invalidConfig,
]
