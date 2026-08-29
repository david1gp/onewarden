export function organizationEventNameResolve(type: number): string {
  switch (type) {
    case 1000:
      return "User Logged In"
    case 1001:
      return "Master Password Changed"
    case 1002:
      return "Two-Step Login Updated"
    case 1003:
      return "Two-Step Login Disabled"
    case 1004:
      return "Two-Step Login Recovered"
    case 1005:
      return "Failed Login Attempt"
    case 1006:
      return "Failed Two-Step Attempt"
    case 1007:
      return "Vault Exported"
    case 1010:
      return "Device Approval Requested"
    case 1100:
      return "Vault Item Created"
    case 1101:
      return "Vault Item Updated"
    case 1102:
      return "Vault Item Permanently Deleted"
    case 1103:
      return "Attachment Uploaded"
    case 1104:
      return "Attachment Deleted"
    case 1105:
      return "Vault Item Shared"
    case 1106:
      return "Item Collections Updated"
    case 1107:
      return "Vault Item Viewed"
    case 1108:
      return "Password Revealed"
    case 1109:
      return "Hidden Field Revealed"
    case 1110:
      return "Card Code Revealed"
    case 1111:
      return "Password Copied"
    case 1112:
      return "Hidden Field Copied"
    case 1113:
      return "Card Code Copied"
    case 1114:
      return "Autofilled Vault Item"
    case 1115:
      return "Vault Item Soft Deleted"
    case 1116:
      return "Vault Item Restored"
    case 1300:
      return "Collection Created"
    case 1301:
      return "Collection Updated"
    case 1302:
      return "Collection Deleted"
    case 1400:
      return "Group Created"
    case 1401:
      return "Group Updated"
    case 1402:
      return "Group Deleted"
    case 1500:
      return "Member Invited"
    case 1501:
      return "Member Confirmed"
    case 1502:
      return "Member Updated"
    case 1503:
      return "Member Removed"
    case 1504:
      return "Member Groups Updated"
    case 1505:
      return "Member SSO Unlinked"
    case 1506:
      return "Password Reset Enrolled"
    case 1507:
      return "Password Reset Withdrawn"
    case 1508:
      return "Member Password Reset"
    case 1511:
      return "Member Revoked"
    case 1512:
      return "Member Restored"
    case 1600:
      return "Organization Updated"
    case 1601:
      return "Organization Vault Purged"
    case 1602:
      return "Organization Vault Exported"
    case 1700:
      return "Policy Updated"
    default:
      return `Event #${type}`
  }
}
