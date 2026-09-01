import { archives } from "./archives.js"
import { attachments } from "./attachments.js"
import { authRequests } from "./authRequests.js"
import { ciphers } from "./ciphers.js"
import { ciphersCollections } from "./ciphersCollections.js"
import { collections } from "./collections.js"
import { collectionsGroups } from "./collectionsGroups.js"
import { devices } from "./devices.js"
import { emergencyAccess } from "./emergencyAccess.js"
import { event } from "./event.js"
import { extensionSessionHandoffs } from "./extensionSessionHandoffs.js"
import { favorites } from "./favorites.js"
import { folders } from "./folders.js"
import { foldersCiphers } from "./foldersCiphers.js"
import { groups } from "./groups.js"
import { groupsUsers } from "./groupsUsers.js"
import { identitySigningKeys } from "./identitySigningKeys.js"
import { invitations } from "./invitations.js"
import { organizationApiKey } from "./organizationApiKey.js"
import { organizationDomains } from "./organizationDomains.js"
import { organizationPolicies } from "./organizationPolicies.js"
import { organizations } from "./organizations.js"
import { organizationSsoConfigs } from "./organizationSsoConfigs.js"
import { schemaVersion } from "./schemaVersion.js"
import { sendRecipientVerifications } from "./sendRecipientVerifications.js"
import { sends } from "./sends.js"
import { ssoAuth } from "./ssoAuth.js"
import { ssoUsers } from "./ssoUsers.js"
import { twoFactor } from "./twoFactor.js"
import { twoFactorIncomplete } from "./twoFactorIncomplete.js"
import { users } from "./users.js"
import { usersCollections } from "./usersCollections.js"
import { usersOrganizations } from "./usersOrganizations.js"

export const databaseSchema = {
  schemaVersion,
  users,
  invitations,
  identitySigningKeys,
  devices,
  organizationApiKey,
  ssoAuth,
  ssoUsers,
  organizations,
  organizationPolicies,
  organizationDomains,
  organizationSsoConfigs,
  usersOrganizations,
  collections,
  usersCollections,
  groups,
  groupsUsers,
  collectionsGroups,
  folders,
  foldersCiphers,
  ciphers,
  ciphersCollections,
  favorites,
  archives,
  sends,
  sendRecipientVerifications,
  extensionSessionHandoffs,
  emergencyAccess,
  attachments,
  event,
  authRequests,
  twoFactor,
  twoFactorIncomplete,
}
