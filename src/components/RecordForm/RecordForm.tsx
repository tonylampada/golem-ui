import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import type { FormField, RecordRow } from '../../abi/fields'
import { refusedFields, type IdentityAdapter, type RecordsAdapter, type User } from '../../adapters'
import { chipTone, formatValue, initials, userName } from '../../lib/format'
import { useContainerWidth } from '../../lib/use-container-width'
import { recordFormConfigSchema, type RecordFormConfig } from './RecordForm.config'
import {
  blankValue,
  dataOf,
  fromInput,
  patchOf,
  toInput,
  validateAll,
  validateField,
} from './values'

export interface RecordFormAdapters {
  records: RecordsAdapter
  /** Read only for a `user` field whose choices come from `users: 'members'`. */
  identity?: IdentityAdapter
}

export interface RecordFormSlots {
  /**
   * The record `edit` mode loads and writes. The route knows it and the config does not, which is
   * why it is a prop: one config serves every ticket on the board.
   */
  recordId?: string
  /** After a write has landed: the stored row, or `null` when the record was deleted. */
  onDone?: (row: RecordRow | null) => void
  /** Cancel, once the reader has confirmed discarding whatever was unsaved. */
  onCancel?: () => void
}

/** One column below this width, whatever `layout` says. It is Shell's default breakpoint. */
const ONE_COLUMN_BELOW = 768

const messageOf = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'The write did not go through. Try again.'

const controlClass =
  'mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-base text-neutral-900 sm:text-sm'
const okBorder = 'border-neutral-300'
const badBorder = 'border-red-400'

/**
 * Loads the record `edit` mode is about. Create mode never asks, and neither does edit mode with no
 * id — both are answered without a round trip. `null` means a load is still in flight.
 */
function useLoadedRecord(
  records: RecordsAdapter,
  config: RecordFormConfig,
  recordId: string | undefined,
) {
  const [state, setState] = useState<{ id: string; row: RecordRow | null; error: string | null }>()
  const wanted = config.mode === 'edit' ? recordId : undefined

  useEffect(() => {
    if (wanted === undefined) return undefined
    let live = true
    void records.get<RecordRow>(config.collection, wanted).then(
      (row) => {
        if (!live) return
        setState({
          id: wanted,
          row,
          error: row ? null : `There is no ${config.collection} record with the id ${wanted}.`,
        })
      },
      (cause: unknown) => {
        if (live) setState({ id: wanted, row: null, error: messageOf(cause) })
      },
    )
    return () => {
      live = false
    }
  }, [records, config.collection, wanted])

  if (config.mode !== 'edit') return { row: null, error: null }
  if (recordId === undefined) {
    return { row: null, error: 'This form is in edit mode with no `recordId` to load.' }
  }
  // A result for a record the form has moved on from is still in flight for this one.
  return state?.id === recordId ? state : null
}

/** The member list a `user` field picks from. Absent Identity leaves it empty, and the field says so. */
function useMembers(config: RecordFormConfig, identity: IdentityAdapter | undefined) {
  const [members, setMembers] = useState<User[] | null>(null)
  const wanted = config.fields.some((field) => field.type === 'user' && field.users === 'members')

  useEffect(() => {
    if (!wanted || !identity) return undefined
    let live = true
    void identity.listMembers().then(
      (list) => {
        if (live) setMembers(list)
      },
      () => {
        if (live) setMembers([])
      },
    )
    return () => {
      live = false
    }
  }, [wanted, identity])

  return members
}

function ReadOnlyValue({ field, value }: { field: FormField; value: unknown }): ReactNode {
  if (field.type === 'enum') {
    const label = field.options?.find((option) => option.id === value)?.label ?? String(value ?? '')
    if (label === '') return <span className="text-neutral-400">—</span>
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${chipTone(String(value))}`}
      >
        {label}
      </span>
    )
  }
  if (field.type === 'user') {
    const name = userName(value) || String(value ?? '')
    if (name === '') return <span className="text-neutral-400">—</span>
    return (
      <span className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
          {initials(name)}
        </span>
        {name}
      </span>
    )
  }
  return <span>{formatValue(value, field)}</span>
}

function RecordFormBody({
  config,
  adapters,
  recordId,
  onDone,
  onCancel,
}: GolemProps<RecordFormConfig, RecordFormAdapters, RecordFormSlots>) {
  const formId = useId()
  const loaded = useLoadedRecord(adapters.records, config, recordId)
  const members = useMembers(config, adapters.identity)

  const blank = useMemo(() => {
    const start: RecordRow = {}
    for (const field of config.fields) start[field.key] = blankValue(field)
    return start
  }, [config.fields])

  // Nothing is copied out of the loaded record into state: `base` is what the store says plus what
  // has already been written, and `edits` is what the reader has changed on top of it. That keeps
  // one source of truth for every value and makes "dirty" a comparison rather than a flag.
  const [edits, setEdits] = useState<RecordRow>({})
  const [committed, setCommitted] = useState<RecordRow>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState<'cancel' | 'delete' | null>(null)

  const controls = useRef<Record<string, HTMLElement | null>>({})

  const base = useMemo(() => {
    const start: RecordRow = { ...blank }
    const row = loaded?.row
    if (row) {
      for (const field of config.fields) {
        if (row[field.key] !== undefined) start[field.key] = row[field.key]
      }
    }
    return { ...start, ...committed }
  }, [blank, loaded, committed, config.fields])

  const values = useMemo(() => ({ ...base, ...edits }), [base, edits])

  const editable = useMemo(() => config.fields.filter((field) => !field.readOnly), [config.fields])
  const dirty = editable.some((field) => values[field.key] !== base[field.key])

  const root = useRef<HTMLDivElement>(null)
  const width = useContainerWidth(root)
  const columns = config.layout === 'two-column' && width >= ONE_COLUMN_BELOW ? 2 : 1

  const put = (field: FormField, value: unknown) => {
    setSaved(false)
    setEdits((prev) => ({ ...prev, [field.key]: value }))
  }

  const check = (field: FormField) =>
    setErrors((prev) => {
      const message = validateField(field, values[field.key])
      const next = { ...prev }
      if (message === null) delete next[field.key]
      else next[field.key] = message
      return next
    })

  const land = useCallback((failures: { key: string; message: string }[]) => {
    setErrors(Object.fromEntries(failures.map(({ key, message }) => [key, message])))
    controls.current[failures[0]!.key]?.focus()
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const failures = validateAll(editable, values)
    if (failures.length > 0) {
      land(failures)
      return
    }

    setErrors({})
    setBusy(true)
    // Optimistic: the form says it is saved before the adapter has answered, and a refusal takes
    // it back. The reader sees the common case immediately and the rare one accurately.
    setSaved(true)

    const write =
      config.mode === 'create'
        ? adapters.records.create<RecordRow>(config.collection, dataOf(editable, values))
        : adapters.records.update<RecordRow>(
            config.collection,
            recordId!,
            patchOf(editable, values, base),
          )

    void write.then(
      (row) => {
        setBusy(false)
        // What was just written stops counting as unsaved: create empties the form, edit folds the
        // changes into what the store is now taken to hold.
        if (config.mode === 'edit') setCommitted((prev) => ({ ...prev, ...edits }))
        setEdits({})
        onDone?.(row)
      },
      (cause: unknown) => {
        setBusy(false)
        setSaved(false)
        const refused = refusedFields(cause)
        if (refused) land(refused.map((one) => ({ key: one.field, message: one.message })))
        else setFormError(messageOf(cause))
      },
    )
  }

  const cancel = () => {
    if (dirty) setAsking('cancel')
    else onCancel?.()
  }

  const remove = () => {
    setBusy(true)
    setFormError(null)
    void adapters.records.remove(config.collection, recordId!).then(
      () => {
        setBusy(false)
        setAsking(null)
        onDone?.(null)
      },
      (cause: unknown) => {
        setBusy(false)
        setAsking(null)
        setFormError(messageOf(cause))
      },
    )
  }

  if (loaded === null) {
    return (
      <p className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
        Loading…
      </p>
    )
  }
  if (loaded.error !== null) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 px-4 py-6 text-center text-sm text-red-900"
      >
        {loaded.error}
      </p>
    )
  }

  const control = (field: FormField): ReactNode => {
    const id = `${formId}-${field.key}`
    const bad = errors[field.key] !== undefined
    const described = [field.help ? `${id}-help` : null, bad ? `${id}-error` : null]
      .filter(Boolean)
      .join(' ')
    const shared = {
      id,
      name: field.key,
      'aria-invalid': bad || undefined,
      'aria-describedby': described || undefined,
      'aria-required': field.required || undefined,
      onBlur: () => check(field),
      className: `${controlClass} ${bad ? badBorder : okBorder}`,
    }
    const keep = (element: HTMLElement | null) => {
      controls.current[field.key] = element
    }

    if (field.type === 'boolean') {
      return (
        <input
          {...shared}
          ref={keep}
          type="checkbox"
          checked={values[field.key] === true}
          onChange={(event) => put(field, event.target.checked)}
          className={`mt-1 size-5 rounded border ${bad ? badBorder : okBorder}`}
        />
      )
    }
    if (field.type === 'enum') {
      return (
        <select
          {...shared}
          ref={keep}
          value={String(values[field.key] ?? '')}
          onChange={(event) => put(field, event.target.value)}
        >
          <option value="">{field.placeholder ?? 'Choose…'}</option>
          {field.options?.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }
    if (field.type === 'user' && field.users === 'members') {
      return (
        <select
          {...shared}
          ref={keep}
          value={String(values[field.key] ?? '')}
          onChange={(event) => put(field, event.target.value)}
        >
          <option value="">
            {members === null || members.length === 0 ? 'No members to pick from' : 'Choose…'}
          </option>
          {members?.map((member) => (
            <option key={member.id} value={member.name}>
              {member.name}
            </option>
          ))}
        </select>
      )
    }
    if (field.type === 'text' && field.multiline) {
      return (
        <textarea
          {...shared}
          ref={keep}
          rows={4}
          placeholder={field.placeholder}
          value={toInput(values[field.key], field)}
          onChange={(event) => put(field, event.target.value)}
        />
      )
    }

    const numeric = field.type === 'number' || field.type === 'money'
    return (
      <input
        {...shared}
        ref={keep}
        type={
          field.type === 'date'
            ? 'date'
            : field.type === 'datetime'
              ? 'datetime-local'
              : numeric
                ? 'number'
                : 'text'
        }
        step={field.type === 'money' ? '0.01' : undefined}
        min={numeric && field.min !== undefined ? Number(field.min) : undefined}
        max={numeric && field.max !== undefined ? Number(field.max) : undefined}
        placeholder={field.placeholder}
        value={toInput(values[field.key], field)}
        onChange={(event) => put(field, fromInput(event.target.value, field))}
      />
    )
  }

  const actions = (() => {
    if (asking === 'cancel') {
      return (
        <div role="alertdialog" aria-label="Discard changes" className="flex flex-wrap gap-2">
          <p className="w-full text-sm text-neutral-700">
            You have changes that have not been saved.
          </p>
          <button
            type="button"
            onClick={() => {
              setAsking(null)
              onCancel?.()
            }}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            Discard them
          </button>
          <button
            type="button"
            onClick={() => setAsking(null)}
            className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium"
          >
            Keep editing
          </button>
        </div>
      )
    }
    if (asking === 'delete') {
      return (
        <div role="alertdialog" aria-label="Confirm delete" className="flex flex-wrap gap-2">
          <p className="w-full text-sm text-neutral-700">Deleting this record cannot be undone.</p>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Delete permanently
          </button>
          <button
            type="button"
            onClick={() => setAsking(null)}
            className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium"
          >
            Keep it
          </button>
        </div>
      )
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 sm:flex-none"
        >
          {config.submitLabel}
        </button>
        {config.cancel === 'back' && (
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium"
          >
            Cancel
          </button>
        )}
        {config.deleteAllowed && (
          <button
            type="button"
            onClick={() => setAsking('delete')}
            className="ml-auto rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700"
          >
            Delete
          </button>
        )}
      </div>
    )
  })()

  return (
    <div
      ref={root}
      data-golem-component="RecordForm"
      data-layout={columns === 2 ? 'two-column' : 'single'}
      className="golem-record-form w-full text-neutral-900"
    >
      <form onSubmit={submit} noValidate>
        <div className={`grid gap-4 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {config.fields.map((field) => {
            const id = `${formId}-${field.key}`
            const wide = columns === 2 && field.multiline ? 'col-span-2' : ''
            return (
              <div key={field.key} className={wide}>
                <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
                  {field.label}
                  {field.required && (
                    <span aria-hidden="true" className="text-red-600">
                      {' '}
                      *
                    </span>
                  )}
                </label>
                {field.readOnly ? (
                  <p
                    id={id}
                    className="mt-1 rounded-lg bg-neutral-100 px-3 py-2.5 text-sm text-neutral-700"
                  >
                    <ReadOnlyValue field={field} value={values[field.key]} />
                  </p>
                ) : (
                  control(field)
                )}
                {field.help && (
                  <p id={`${id}-help`} className="mt-1 text-xs text-neutral-500">
                    {field.help}
                  </p>
                )}
                {errors[field.key] && (
                  <p
                    id={`${id}-error`}
                    role="alert"
                    className="mt-1 text-xs font-medium text-red-700"
                  >
                    {errors[field.key]}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Thumb-reachable on a phone, and it stays put while a long form scrolls under it. */}
        <div className="sticky bottom-0 mt-5 border-t border-neutral-200 bg-white py-3">
          {formError !== null && (
            <p role="alert" className="mb-2 text-sm font-medium text-red-700">
              {formError}
            </p>
          )}
          {saved && (
            <p role="status" className="mb-2 text-sm font-medium text-emerald-700">
              {config.successMessage}
            </p>
          )}
          {config.mode === 'edit' && dirty && !saved && (
            <p className="mb-2 text-xs font-medium text-amber-700">Unsaved changes</p>
          )}
          {actions}
        </div>
      </form>
    </div>
  )
}

export const RecordForm = defineComponent<
  typeof recordFormConfigSchema,
  RecordFormAdapters,
  RecordFormSlots
>({
  name: 'RecordForm',
  schema: recordFormConfigSchema,
  render: RecordFormBody,
})
