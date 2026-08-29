import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"

export interface CipherIdentityFormSectionStateProps {
  titleSignal: SignalObject<string>
  firstNameSignal: SignalObject<string>
  middleNameSignal: SignalObject<string>
  lastNameSignal: SignalObject<string>
  companySignal: SignalObject<string>
  emailSignal: SignalObject<string>
  phoneSignal: SignalObject<string>
  address1Signal: SignalObject<string>
  address2Signal: SignalObject<string>
  citySignal: SignalObject<string>
  stateSignal: SignalObject<string>
  postalCodeSignal: SignalObject<string>
  countrySignal: SignalObject<string>
  ssnSignal: SignalObject<string>
  passportNumberSignal: SignalObject<string>
  licenseNumberSignal: SignalObject<string>
  usernameSignal: SignalObject<string>
}

export function cipherIdentityFormSectionStateCreate(props: CipherIdentityFormSectionStateProps) {
  const isSsnRevealed = createSignalObject(false)
  const isPassportRevealed = createSignalObject(false)

  const toggleSsnReveal = () => isSsnRevealed.set(!isSsnRevealed.get())
  const togglePassportReveal = () => isPassportRevealed.set(!isPassportRevealed.get())

  const titleOptions = () => ["", "Mr", "Mrs", "Ms", "Mx", "Dr", "Prof"]

  return {
    titleSignal: props.titleSignal,
    firstNameSignal: props.firstNameSignal,
    middleNameSignal: props.middleNameSignal,
    lastNameSignal: props.lastNameSignal,
    companySignal: props.companySignal,
    emailSignal: props.emailSignal,
    phoneSignal: props.phoneSignal,
    address1Signal: props.address1Signal,
    address2Signal: props.address2Signal,
    citySignal: props.citySignal,
    stateSignal: props.stateSignal,
    postalCodeSignal: props.postalCodeSignal,
    countrySignal: props.countrySignal,
    ssnSignal: props.ssnSignal,
    passportNumberSignal: props.passportNumberSignal,
    licenseNumberSignal: props.licenseNumberSignal,
    usernameSignal: props.usernameSignal,
    isSsnRevealed: isSsnRevealed.get,
    isPassportRevealed: isPassportRevealed.get,
    toggleSsnReveal,
    togglePassportReveal,
    titleOptions,
  }
}
