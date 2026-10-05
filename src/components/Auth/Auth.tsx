import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import type { IdentityAdapter, NavigationAdapter, User } from '../../adapters'
import { authConfigSchema, type AuthConfig, type AuthRole } from './Auth.config'

export interface AuthAdapters {
  identity: IdentityAdapter
  navigation: NavigationAdapter
}

export interface AuthGuardSlots {
  /** Roles allowed through. Empty — or left out — means any signed-in person. */
  roles?: string[]
  /** What the allowed reader sees. */
  children?: ReactNode
}

/** Who is here, and whether we have asked yet. `ready` keeps a blank frame off the screen. */
function useSession(identity: IdentityAdapter) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    void identity.currentUser().then((next) => {
      if (!live) return
      setUser(next)
      setReady(true)
    })
    const unsubscribe = identity.subscribe(setUser)
    return () => {
      live = false
      unsubscribe()
    }
  }, [identity])

  return { user, ready }
}

/**
 * A token off the route — `invite` or `reset` — rather than off `window`: the app's Navigation
 * adapter is what knows how its URLs are shaped, so a hash router and a path router both land here.
 */
function useRouteToken(navigation: NavigationAdapter, name: string): string | undefined {
  const [token, setToken] = useState(() => navigation.current().params[name])
  useEffect(() => navigation.subscribe((route) => setToken(route.params[name])), [navigation, name])
  return token
}

function roleFor(config: AuthConfig, user: User | null): AuthRole | undefined {
  return config.roles.find((role) => user?.roles.includes(role.id))
}

function labelForRole(config: AuthConfig, user: User): string {
  return roleFor(config, user)?.label ?? user.roles[0] ?? '—'
}

function canManage(config: AuthConfig, user: User | null): boolean {
  return config.roles.some((role) => role.manages && user?.roles.includes(role.id))
}

/** Adapter rejections are written for the reader, so the message is shown as it arrives. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}

const fieldClass =
  'mt-1 w-full rounded-lg border border-(--chat-line2) bg-(--chat-panel) px-3 py-2.5 text-base text-(--chat-text)'
const primaryClass =
  'w-full rounded-lg bg-(--chat-text) px-4 py-2.5 text-sm font-medium text-(--chat-bg) disabled:opacity-50'
const quietClass =
  'rounded-lg border border-(--chat-line2) bg-(--chat-panel) px-3 py-2 text-sm font-medium text-(--chat-text)'

function Field({ label, ...input }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-(--chat-dim)">{label}</span>
      <input {...input} className={fieldClass} />
    </label>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="golem-auth flex h-full w-full items-center justify-center bg-(--chat-bg) p-4 text-(--chat-text)">
      <div className="w-full max-w-sm rounded-xl border border-(--chat-line) bg-(--chat-panel) p-5 sm:p-6">
        {children}
      </div>
    </div>
  )
}

/**
 * Sign in, sign up, and the one-time-code detour. One card with one error line: whatever the
 * adapter refused is what the reader reads.
 */
function SignInScreen({ config, adapters }: { config: AuthConfig; adapters: AuthAdapters }) {
  const invite = useRouteToken(adapters.navigation, 'invite')
  const reset = useRouteToken(adapters.navigation, 'reset')
  const signUpOffered = config.allowSignUp && !config.inviteOnly
  const signUpReachable = Boolean(invite) || signUpOffered

  // `null` means the reader has not chosen: an invite link opens on sign-up, anything else on sign-in.
  const [chose, setChose] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // A reset link only means something when the adapter can set a password from it.
  const resetting = Boolean(reset) && Boolean(adapters.identity.setPassword)
  const creating = chose ?? Boolean(invite)
  const creatingNow = !resetting && creating && signUpReachable
  const codeStage = !resetting && config.mode === 'code' && !creatingNow && codeSent

  const run = async (event: FormEvent, action: () => Promise<unknown>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) =>
    run(event, async () => {
      if (resetting) {
        await adapters.identity.setPassword!(reset!, secret)
        setSecret('')
        setNotice('Your password is set. Sign in with it.')
        // The token is spent, so it leaves the route: a reload lands on the sign-in card.
        adapters.navigation.go(adapters.navigation.current().path)
        return
      }
      if (creatingNow) {
        await adapters.identity.signUp({
          name,
          email,
          ...(config.mode === 'password' ? { password: secret } : {}),
          ...(invite ? { invite } : {}),
        })
        return
      }
      if (config.mode === 'password') {
        await adapters.identity.signIn(email, secret)
        return
      }
      if (!codeSent) {
        await adapters.identity.requestCode(email)
        setCodeSent(true)
        return
      }
      await adapters.identity.verifyCode(email, secret)
    })

  const title = resetting
    ? 'Choose a new password'
    : creatingNow
      ? config.copy.signUpTitle
      : config.copy.signInTitle

  return (
    <Card>
      <h1
        data-golem-auth-screen={resetting ? 'reset-password' : creatingNow ? 'sign-up' : 'sign-in'}
        className="text-lg font-semibold"
      >
        {title}
      </h1>
      <p className="mt-1 text-sm text-(--chat-dim)">
        {invite && creatingNow
          ? `You have been invited to ${config.workspaceName}.`
          : config.workspaceName}
      </p>
      {/* The hint is about getting back in, so it stays off the sign-up form. */}
      {config.copy.hint && !creatingNow && !resetting && (
        <p className="mt-3 text-xs text-(--chat-dim)">{config.copy.hint}</p>
      )}
      {notice && <p className="mt-3 text-sm text-(--chat-dim)">{notice}</p>}

      <form className="mt-4 space-y-3" onSubmit={submit}>
        {resetting ? (
          <Field
            label="New password"
            type="password"
            value={secret}
            autoComplete="new-password"
            onChange={(event) => setSecret(event.target.value)}
          />
        ) : (
          <>
            {creatingNow && (
              <Field
                label="Your name"
                value={name}
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              autoComplete="email"
              readOnly={codeStage}
              onChange={(event) => setEmail(event.target.value)}
            />
            {(creatingNow
              ? config.mode === 'password'
              : config.mode === 'password' || codeStage) && (
              <Field
                label={config.mode === 'password' ? 'Password' : 'Six-digit code'}
                type={config.mode === 'password' ? 'password' : 'text'}
                value={secret}
                autoComplete={config.mode === 'password' ? 'current-password' : 'one-time-code'}
                inputMode={config.mode === 'code' ? 'numeric' : undefined}
                onChange={(event) => setSecret(event.target.value)}
              />
            )}
          </>
        )}

        {codeStage && <p className="text-xs text-(--chat-dim)">We sent a code to {email}.</p>}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-(--chat-danger) px-3 py-2 text-sm text-(--chat-danger)"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={primaryClass}>
          {resetting
            ? 'Set password'
            : config.mode === 'code' && !creatingNow && !codeSent
              ? 'Email me a code'
              : config.copy.submit}
        </button>
      </form>

      {signUpOffered && !invite && !resetting && (
        <button
          type="button"
          onClick={() => {
            setChose(!creating)
            setError(null)
          }}
          className="mt-3 w-full text-sm text-(--chat-dim) underline"
        >
          {creating ? 'I already have an account' : 'Create an account'}
        </button>
      )}
      {config.inviteOnly && !invite && !resetting && (
        <p className="mt-3 text-xs text-(--chat-dim)">
          {config.workspaceName} is invite only. Ask someone inside for a link.
        </p>
      )}
    </Card>
  )
}

function useMembers(identity: IdentityAdapter, user: User | null) {
  const [members, setMembers] = useState<User[]>([])
  const reload = useCallback(() => {
    void identity.listMembers().then(setMembers)
  }, [identity])

  // Re-read whenever the signed-in person changes: a different role sees a different list.
  useEffect(reload, [reload, user])

  return { members, reload }
}

/** The native share sheet, where the browser has one: on a phone it is how a link reaches a chat. */
function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/**
 * A minted link, ready to hand over: the URL in full, Copy, Share where the browser offers it, and
 * how long it lasts when the config says. Clipboard access is a permission, so the URL stays on
 * screen to select by hand either way.
 */
function LinkResult({
  title,
  link,
  expiry,
  workspaceName,
}: {
  title: string
  link: string
  expiry: string
  workspaceName: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      data-golem-auth-link="true"
      className="rounded-xl border border-(--chat-line) bg-(--chat-panel2) p-3"
    >
      <p className="text-sm font-medium">{title}</p>
      <input
        readOnly
        aria-label="Link to send"
        value={link}
        onFocus={(event) => event.target.select()}
        className={`${fieldClass} font-mono text-xs`}
      />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => void copy()} className={`flex-1 ${quietClass}`}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        {canShare() && (
          <button
            type="button"
            // Dismissing the share sheet rejects; that is the reader changing their mind, not a failure.
            onClick={() =>
              void navigator.share({ title: workspaceName, url: link }).catch(() => {})
            }
            className={`flex-1 ${quietClass}`}
          >
            Share
          </button>
        )}
      </div>
      {expiry && <p className="mt-2 text-xs text-(--chat-dim)">{expiry}</p>}
    </div>
  )
}

function RolePill({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border border-(--chat-line2) bg-(--chat-panel2) px-2 py-0.5 text-xs font-medium whitespace-nowrap text-(--chat-text)">
      {children}
    </span>
  )
}

/** One member, for reading: the whole name, wrapped and never cut; the address under it; the role as a pill. */
function MemberSummary({
  config,
  member,
  self,
}: {
  config: AuthConfig
  member: User
  self: boolean
}) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium break-words">
          {member.name}
          {self && <span className="font-normal text-(--chat-dim)"> (you)</span>}
        </span>
        {member.email && (
          <span className="block truncate text-xs text-(--chat-dim)">{member.email}</span>
        )}
      </span>
      <RolePill>{labelForRole(config, member)}</RolePill>
    </>
  )
}

/**
 * Everything a managing role does to one member. A bottom sheet on a phone, a centred dialog on a
 * wide screen — one element, so the two cannot drift. Escape and the backdrop both close it.
 */
function MemberDetail({
  config,
  adapters,
  member,
  self,
  onChanged,
  onClose,
}: {
  config: AuthConfig
  adapters: AuthAdapters
  member: User
  self: boolean
  onChanged: () => void
  onClose: () => void
}) {
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Focus moves into the sheet, and back to the row that opened it when the sheet goes.
    const opener = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onClose])

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }

  const firstName = member.name.split(/\s+/)[0] || member.name

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={member.name}
        tabIndex={-1}
        data-golem-auth-detail={member.id}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-(--chat-line) bg-(--chat-panel) px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-(--chat-text) shadow-xl outline-none sm:max-w-md sm:rounded-2xl sm:pt-5"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-(--chat-line2) sm:hidden"
        />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold break-words">{member.name}</h2>
            {member.email && (
              <p className="text-sm [overflow-wrap:anywhere] text-(--chat-dim)">{member.email}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-2 shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-(--chat-dim)"
          >
            ×
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-(--chat-dim)">Role</span>
          <select
            aria-label={`Role for ${member.name}`}
            value={roleFor(config, member)?.id ?? config.roles[0]!.id}
            disabled={busy}
            onChange={(event) => {
              const role = event.target.value
              void run(async () => {
                await adapters.identity.setRole(member.id, role)
                onChanged()
              })
            }}
            className={fieldClass}
          >
            {config.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </label>

        {adapters.identity.resetPassword && (
          <div className="mt-5 space-y-3">
            {resetLink ? (
              <LinkResult
                title={`Send this to ${firstName}. It lets them choose a new password.`}
                link={resetLink}
                expiry={config.copy.resetExpiry}
                workspaceName={config.workspaceName}
              />
            ) : (
              <button
                type="button"
                aria-label={`Reset password for ${member.name}`}
                disabled={busy}
                onClick={() =>
                  void run(async () =>
                    setResetLink(await adapters.identity.resetPassword!(member.id)),
                  )
                }
                className={`w-full ${quietClass}`}
              >
                Reset password
              </button>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-(--chat-danger) px-3 py-2 text-sm text-(--chat-danger)"
          >
            {error}
          </p>
        )}

        {/* Removing yourself is how a person locks themselves out, so that control is not drawn. */}
        {!self && (
          <div className="mt-6 border-t border-(--chat-line) pt-4">
            {confirming ? (
              <div role="alertdialog" aria-label={`Remove ${member.name}?`}>
                <p className="text-sm">
                  Remove {member.name}? They lose access to {config.workspaceName} at once.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className={`flex-1 ${quietClass}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${member.name}`}
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await adapters.identity.removeMember(member.id)
                        onChanged()
                        onClose()
                      })
                    }
                    className="flex-1 rounded-lg bg-(--chat-danger) px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="w-full rounded-lg px-3 py-2 text-sm font-medium text-(--chat-danger)"
              >
                Remove from {config.workspaceName}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MembersScreen({
  config,
  adapters,
  user,
}: {
  config: AuthConfig
  adapters: AuthAdapters
  user: User
}) {
  const { members, reload } = useMembers(adapters.identity, user)
  const manages = canManage(config, user)
  const [inviteRole, setInviteRole] = useState(config.roles[0]!.id)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const close = useCallback(() => setOpenId(null), [])

  // Read off the live list, so a role change shows in the sheet and a removal closes it.
  const open = members.find((member) => member.id === openId)

  const invite = async () => {
    setInviteError(null)
    try {
      setInviteLink(await adapters.identity.invite(inviteRole))
    } catch (failure) {
      setInviteError(messageOf(failure))
    }
  }

  return (
    <div
      data-golem-component="Auth"
      className="golem-auth mx-auto w-full max-w-2xl px-4 py-5 text-(--chat-text) sm:px-6 sm:py-7"
    >
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {config.copy.membersTitle}
      </h1>
      <p className="mt-1 text-sm text-(--chat-dim)">
        Everyone who can open {config.workspaceName}.
      </p>

      {manages && (
        <section aria-label="Invite" className="mt-5 space-y-3">
          <div className="flex gap-2">
            <select
              aria-label="Role for the invite"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-(--chat-line2) bg-(--chat-panel) px-3 py-2.5 text-base text-(--chat-text) sm:max-w-xs sm:text-sm"
            >
              {config.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void invite()}
              className="shrink-0 rounded-lg bg-(--chat-text) px-5 py-2.5 text-sm font-medium text-(--chat-bg)"
            >
              Invite
            </button>
          </div>
          {inviteError && (
            <p role="alert" className="text-sm text-(--chat-danger)">
              {inviteError}
            </p>
          )}
          {inviteLink && (
            <LinkResult
              // A new link is a new result: keyed, so "Copied" does not carry over to it.
              key={inviteLink}
              title="Send this link. Whoever opens it joins with that role."
              link={inviteLink}
              expiry={config.copy.inviteExpiry}
              workspaceName={config.workspaceName}
            />
          )}
        </section>
      )}

      <ul className="mt-5 divide-y divide-(--chat-line) overflow-hidden rounded-xl border border-(--chat-line) bg-(--chat-panel)">
        {members.map((member) => (
          <li key={member.id} data-golem-auth-member={member.id}>
            {manages ? (
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setOpenId(member.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-(--chat-panel2)"
              >
                <MemberSummary config={config} member={member} self={member.id === user.id} />
                <span aria-hidden="true" className="shrink-0 text-(--chat-faint)">
                  ›
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <MemberSummary config={config} member={member} self={member.id === user.id} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {manages && open && (
        <MemberDetail
          config={config}
          adapters={adapters}
          member={open}
          self={open.id === user.id}
          onChanged={reload}
          onClose={close}
        />
      )}
    </div>
  )
}

function AccountMenuPanel({ config, adapters }: GolemProps<AuthConfig, AuthAdapters>) {
  const { user } = useSession(adapters.identity)
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <div
      data-golem-component="Auth.AccountMenu"
      className="golem-auth relative shrink-0 text-(--chat-text)"
    >
      {/* Avatar only: the bar carries icons, and the name is in the popover. */}
      <button
        type="button"
        aria-expanded={open}
        aria-label={user.name}
        title={user.name}
        onClick={() => setOpen(!open)}
        className="flex size-8 items-center justify-center rounded-full bg-(--chat-text) text-[11px] font-semibold text-(--chat-bg)"
      >
        {initialsOf(user.name)}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-(--chat-line2) bg-(--chat-panel) p-3 shadow-lg">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-(--chat-dim)">{user.email}</p>
          <p className="mt-1 text-xs text-(--chat-dim)">{labelForRole(config, user)}</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void adapters.identity.signOut()
            }}
            className={`mt-3 w-full ${quietClass}`}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function DeniedCard({
  config,
  adapters,
  user,
  roles,
}: {
  config: AuthConfig
  adapters: AuthAdapters
  user: User
  roles: string[]
}) {
  const allowed = roles
    .map((id) => config.roles.find((role) => role.id === id)?.label ?? id)
    .join(', ')

  return (
    <Card>
      <div role="alert" data-golem-auth-denied="true">
        <h1 className="text-lg font-semibold">{config.copy.denied}</h1>
        <p className="mt-2 text-sm text-(--chat-dim)">
          You are signed in as {user.name} ({labelForRole(config, user)}). This screen is for:{' '}
          {allowed}.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void adapters.identity.signOut()}
        className={`mt-4 w-full ${quietClass}`}
      >
        Sign out
      </button>
    </Card>
  )
}

function AuthScreen({ config, adapters }: GolemProps<AuthConfig, AuthAdapters>) {
  const { user, ready } = useSession(adapters.identity)
  if (!ready) return null
  if (!user) return <SignInScreen config={config} adapters={adapters} />
  return <MembersScreen config={config} adapters={adapters} user={user} />
}

function AuthGuard({
  config,
  adapters,
  roles = [],
  children,
}: GolemProps<AuthConfig, AuthAdapters, AuthGuardSlots>) {
  const { user, ready } = useSession(adapters.identity)
  if (!ready) return null
  if (!user) return <SignInScreen config={config} adapters={adapters} />
  if (roles.length > 0 && !roles.some((role) => user.roles.includes(role))) {
    return <DeniedCard config={config} adapters={adapters} user={user} roles={roles} />
  }
  return <>{children}</>
}

const AuthComponent = defineComponent<typeof authConfigSchema, AuthAdapters>({
  name: 'Auth',
  schema: authConfigSchema,
  render: AuthScreen,
})

const Guard = defineComponent<typeof authConfigSchema, AuthAdapters, AuthGuardSlots>({
  name: 'Auth.Guard',
  schema: authConfigSchema,
  render: AuthGuard,
})

const AccountMenu = defineComponent<typeof authConfigSchema, AuthAdapters>({
  name: 'Auth.AccountMenu',
  schema: authConfigSchema,
  render: AccountMenuPanel,
})

/**
 * Everything an app needs around identity. `Auth` is the screen — sign in when nobody is signed in,
 * the member list when someone is; `Auth.Guard` wraps what only certain roles may see; and
 * `Auth.AccountMenu` is the name-and-sign-out control a top bar hosts.
 */
export const Auth = Object.assign(AuthComponent, { Guard, AccountMenu })
