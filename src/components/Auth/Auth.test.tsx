import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AuthAdapters } from './Auth'
import { Auth } from './Auth'
import type { AuthConfigInput } from './Auth.config'
import * as examples from './Auth.examples'
import { fakeIdentity, fakeNavigation } from '../../adapters/fake'
import type { User } from '../../adapters'

const owner: User = {
  id: 'u-nadia',
  name: 'Nadia Kessler',
  email: 'nadia@northgatecycles.example',
  roles: ['owner'],
}
const mechanic: User = {
  id: 'u-omar',
  name: 'Omar Bright',
  email: 'omar@northgatecycles.example',
  roles: ['mechanic'],
}

const config: AuthConfigInput = {
  workspaceName: 'Northgate Cycles',
  roles: [
    { id: 'mechanic', label: 'Mechanic' },
    { id: 'owner', label: 'Owner', manages: true },
  ],
}

function wire(options: Parameters<typeof fakeIdentity>[0] = {}, route = fakeNavigation()) {
  const identity = fakeIdentity({ members: [owner, mechanic], password: 'northgate', ...options })
  return { identity, adapters: { identity, navigation: route } satisfies AuthAdapters }
}

/** Lets the adapter's `currentUser()` promise land, so no state update escapes `act`. */
const flush = () => act(async () => {})

describe('Auth', () => {
  it('renders every documented example without crashing', async () => {
    for (const example of examples.authExamples) {
      const { unmount } = render(examples.renderExample(example))
      await flush()
      unmount()
    }
  })

  it('shows the adapter’s refusal inline when the password is wrong', async () => {
    const { adapters } = wire({ user: null })
    render(<Auth config={config} adapters={adapters} />)
    await flush()

    await userEvent.type(screen.getByLabelText('Email'), owner.email!)
    await userEvent.type(screen.getByLabelText('Password'), 'not-it')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That password is not right.')
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('flips the guard on sign in and back on sign out', async () => {
    const { identity, adapters } = wire({ user: null })
    render(
      <Auth.Guard config={config} adapters={adapters}>
        <p>The workspace DNA, in full.</p>
      </Auth.Guard>,
    )
    await flush()

    expect(screen.queryByText('The workspace DNA, in full.')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Email'), owner.email!)
    await userEvent.type(screen.getByLabelText('Password'), 'northgate')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('The workspace DNA, in full.')).toBeInTheDocument()

    await act(async () => {
      await identity.signOut()
    })
    expect(screen.queryByText('The workspace DNA, in full.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('denies a role the guard does not list, and names what is missing', async () => {
    const { adapters } = wire({ user: mechanic })
    render(
      <Auth.Guard config={config} adapters={adapters} roles={['owner']}>
        <p>The workspace DNA, in full.</p>
      </Auth.Guard>,
    )
    await flush()

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('Omar Bright')
    expect(card).toHaveTextContent('Owner')
    expect(screen.queryByText('The workspace DNA, in full.')).not.toBeInTheDocument()
  })

  it('round-trips an invite URL into a sign-up that lands with the invited role', async () => {
    const { identity } = wire({ user: owner })
    const url = await identity.invite('mechanic')
    const token = url.slice(url.lastIndexOf('=') + 1)

    // The link is opened in a fresh session: signed out, on the route the URL encodes.
    const joining = fakeIdentity({
      user: null,
      members: [owner],
      invites: { [token]: 'mechanic' },
    })
    const adapters: AuthAdapters = {
      identity: joining,
      navigation: fakeNavigation({ path: '/join', params: { invite: token } }),
    }

    render(
      <Auth.Guard
        config={{ ...config, allowSignUp: false, inviteOnly: true }}
        adapters={adapters}
        roles={['mechanic']}
      >
        <p>The bench diary.</p>
      </Auth.Guard>,
    )
    await flush()

    expect(screen.getByText('You have been invited to Northgate Cycles.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Your name'), 'Hana Vogt')
    await userEvent.type(screen.getByLabelText('Email'), 'hana@northgatecycles.example')
    await userEvent.type(screen.getByLabelText('Password'), 'build-stand')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // Through the guard means the invite decided the role, not the form.
    expect(await screen.findByText('The bench diary.')).toBeInTheDocument()
    expect((await joining.currentUser())?.roles).toEqual(['mechanic'])
  })

  it('gives a member no way to remove anyone, and an admin one per other person', async () => {
    const asMember = wire({ user: mechanic })
    const { unmount } = render(<Auth config={config} adapters={asMember.adapters} />)
    await waitFor(() => expect(screen.getByText('Nadia Kessler')).toBeInTheDocument())
    expect(screen.queryAllByRole('button', { name: /^Remove/ })).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Invite by link' })).not.toBeInTheDocument()
    unmount()

    const asAdmin = wire({ user: owner })
    render(<Auth config={config} adapters={asAdmin.adapters} />)
    await waitFor(() => expect(screen.getByText('Omar Bright')).toBeInTheDocument())
    const removals = screen.getAllByRole('button', { name: /^Remove/ })
    expect(removals.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove Omar Bright',
    ])

    await userEvent.click(removals[0]!)
    await waitFor(() => expect(screen.queryByText('Omar Bright')).not.toBeInTheDocument())
  })

  it('sends a code before it asks for one, in code mode', async () => {
    const { adapters } = wire({ user: null, code: '123456' })
    render(<Auth config={{ ...config, mode: 'code' }} adapters={adapters} />)
    await flush()

    expect(screen.queryByLabelText('Six-digit code')).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Email'), owner.email!)
    await userEvent.click(screen.getByRole('button', { name: 'Email me a code' }))

    const code = await screen.findByLabelText('Six-digit code')
    await userEvent.type(code, '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That code is not right.')

    await userEvent.clear(code)
    await userEvent.type(code, '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByText('Members')).toBeInTheDocument())
  })

  it('signs out from the account menu', async () => {
    const { identity, adapters } = wire({ user: owner })
    render(<Auth.AccountMenu config={config} adapters={adapters} />)

    const opener = await screen.findByRole('button', { name: /Nadia Kessler/ })
    await userEvent.click(opener)
    await userEvent.click(within(document.body).getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(screen.queryByText('Nadia Kessler')).not.toBeInTheDocument())
    expect(await identity.currentUser()).toBeNull()
  })

  it('renders an error card naming every invalid field instead of the screen', async () => {
    render(<Auth {...examples.invalidConfig.props} />)
    await flush()

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('workspaceName')
    expect(card).toHaveTextContent('mode')
  })

  it('rejects unknown config fields, so a misspelt option is never silently ignored', async () => {
    render(
      <Auth
        {...examples.signedOutPassword.props}
        config={{ workspaceName: 'x', allowsignup: false } as never}
      />,
    )
    await flush()
    expect(screen.getByRole('alert')).toHaveTextContent('allowsignup')
  })
})
