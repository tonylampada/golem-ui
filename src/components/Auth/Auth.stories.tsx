import type { Meta, StoryObj } from '@storybook/react-vite'
import { Auth } from './Auth'
import * as examples from './Auth.examples'

const meta = {
  title: 'Components/Auth',
  component: Auth,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Auth>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every story is one example from `Auth.examples.tsx` — the same file the tests import — rendered
 * through the same `renderExample`, so a story and a test can never show different things.
 */
const story = (example: examples.AuthExample): Story => ({
  name: example.name,
  args: example.props,
  parameters: { docs: { description: { story: example.summary } } },
  render: () => renderInFrame(example),
})

function renderInFrame(example: examples.AuthExample) {
  return (
    <div
      style={{
        width: example.viewportWidth,
        maxWidth: '100%',
        minHeight: 460,
        border: '1px solid #e5e5e5',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fafafa',
      }}
    >
      {examples.renderExample(example)}
    </div>
  )
}

export const SignedOutPassword = story(examples.signedOutPassword)
export const SignedOutCode = story(examples.signedOutCode)
export const SignUpViaInvite = story(examples.signUpViaInvite)
export const AccountMenu = story(examples.accountMenu)
export const MembersAsAdmin = story(examples.membersAsAdmin)
export const MembersAsMember = story(examples.membersAsMember)
export const GuardDenies = story(examples.guardDenies)
export const InvalidConfig = story(examples.invalidConfig)
