import type { AuthConfigInput } from 'golem-ui'
import { SHOP_PASSWORD } from './seed'

/**
 * One config for all three Auth surfaces: the front door, the Team screen, the account menu in the
 * top bar, and the owner-only guard on the DNA screen.
 */
export const authConfig: AuthConfigInput = {
  workspaceName: 'Northgate Cycles',
  mode: 'password',
  allowSignUp: false,
  inviteOnly: true,
  roles: [
    { id: 'mechanic', label: 'Mechanic' },
    { id: 'front desk', label: 'Front desk' },
    { id: 'apprentice', label: 'Apprentice' },
    { id: 'owner', label: 'Owner', manages: true },
  ],
  copy: {
    hint: `Any of the shop's five accounts — nadia@, omar@, priya@, theo@ or hana@northgatecycles.example — with the password ${SHOP_PASSWORD}.`,
  },
}

/** The role that may edit the workspace DNA, and the only one the guard on that screen lets past. */
export const DNA_ROLE = 'owner'
