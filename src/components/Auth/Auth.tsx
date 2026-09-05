import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
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
 * The invite token, read off the route rather than off `window`: the app's Navigation adapter is
 * what knows how its URLs are shaped, so a hash router and a path router both land here.
 */
function useInviteToken(navigation: NavigationAdapter): string | undefined {
  const [token, setToken] = useState(() => navigation.current().params.invite)
  useEffect(() => navigation.subscribe((route) => setToken(route.params.invite)), [navigation])
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
  'mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base text-neutral-900'
const primaryClass =
  'w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'
const quietClass = 'rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium'

function Field({
  label,
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input {...input} className={fieldClass} />
    </label>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
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
  const invite = useInviteToken(adapters.navigation)
  const signUpOffered = config.allowSignUp && !config.inviteOnly
  const signUpReachable = Boolean(invite) || signUpOffered

  // `null` means the reader has not chosen: an invite link opens on sign-up, anything else on sign-in.
  const [chose, setChose] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const creating = chose ?? Boolean(invite)
  const creatingNow = creating && signUpReachable
  const codeStage = config.mode === 'code' && !creatingNow && codeSent

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

  const title = creatingNow ? config.copy.signUpTitle : config.copy.signInTitle

  return (
    <Card>
      <h1
        data-golem-auth-screen={creatingNow ? 'sign-up' : 'sign-in'}
        className="text-lg font-semibold"
      >
        {title}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {invite && creatingNow
          ? `You have been invited to ${config.workspaceName}.`
          : config.workspaceName}
      </p>
      {config.copy.hint && <p className="mt-3 text-xs text-neutral-500">{config.copy.hint}</p>}

      <form className="mt-4 space-y-3" onSubmit={submit}>
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
        {(creatingNow ? config.mode === 'password' : config.mode === 'password' || codeStage) && (
          <Field
            label={config.mode === 'password' ? 'Password' : 'Six-digit code'}
            type={config.mode === 'password' ? 'password' : 'text'}
            value={secret}
            autoComplete={config.mode === 'password' ? 'current-password' : 'one-time-code'}
            inputMode={config.mode === 'code' ? 'numeric' : undefined}
            onChange={(event) => setSecret(event.target.value)}
          />
        )}

        {codeStage && <p className="text-xs text-neutral-500">We sent a code to {email}.</p>}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={primaryClass}>
          {config.mode === 'code' && !creatingNow && !codeSent
            ? 'Email me a code'
            : config.copy.submit}
        </button>
      </form>

      {signUpOffered && !invite && (
        <button
          type="button"
          onClick={() => {
            setChose(!creating)
            setError(null)
          }}
          className="mt-3 w-full text-sm text-neutral-600 underline"
        >
          {creating ? 'I already have an account' : 'Create an account'}
        </button>
      )}
      {config.inviteOnly && !invite && (
        <p className="mt-3 text-xs text-neutral-500">
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
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const mint = async () => {
    const url = await adapters.identity.invite(inviteRole)
    setInviteUrl(url)
    setCopied(false)
    // Clipboard access is a permission and a browser feature, so the URL is on screen either way.
    try {
      await navigator.clipboard?.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      data-golem-component="Auth"
      className="golem-auth mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {config.copy.membersTitle}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Everyone who can open {config.workspaceName}.
          </p>
        </div>
        {manages && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <select
              aria-label="Role for the invite"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
            >
              {config.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void mint()} className={quietClass}>
              Invite by link
            </button>
          </div>
        )}
      </div>

      {inviteUrl && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium">
            Send this link. {copied ? 'It is on your clipboard.' : 'Copy it from here.'}
          </p>
          <input
            readOnly
            aria-label="Invite link"
            value={inviteUrl}
            onFocus={(event) => event.target.select()}
            className={`${fieldClass} font-mono text-xs`}
          />
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {members.map((member) => (
          <li
            key={member.id}
            data-golem-auth-member={member.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.name}</p>
              <p className="truncate text-xs text-neutral-500">{member.email}</p>
            </div>
            {manages ? (
              <select
                aria-label={`Role for ${member.name}`}
                value={roleFor(config, member)?.id ?? config.roles[0]!.id}
                onChange={(event) => {
                  void adapters.identity.setRole(member.id, event.target.value).then(reload)
                }}
                className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
              >
                {config.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                {labelForRole(config, member)}
              </span>
            )}
            {/* Removing yourself is how a person locks themselves out, so that button is not drawn. */}
            {manages && member.id !== user.id && (
              <button
                type="button"
                aria-label={`Remove ${member.name}`}
                onClick={() => {
                  void adapters.identity.removeMember(member.id).then(reload)
                }}
                className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-red-700"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AccountMenuPanel({ config, adapters }: GolemProps<AuthConfig, AuthAdapters>) {
  const { user } = useSession(adapters.identity)
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <div data-golem-component="Auth.AccountMenu" className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-neutral-200 py-1 pr-3 pl-1 text-sm"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">
          {initialsOf(user.name)}
        </span>
        <span className="max-w-28 truncate">{user.name}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-neutral-500">{user.email}</p>
          <p className="mt-1 text-xs text-neutral-500">{labelForRole(config, user)}</p>
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
        <p className="mt-2 text-sm text-neutral-600">
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
