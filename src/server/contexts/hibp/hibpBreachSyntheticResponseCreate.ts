import { hibpUsernameEncode } from "./hibpUsernameEncode.js"

export function hibpBreachSyntheticResponseCreate(username: string) {
  const encodedUsername = hibpUsernameEncode(username)
  return [
    {
      name: "HaveIBeenPwned",
      title: "Manual HIBP Check",
      domain: "haveibeenpwned.com",
      breachDate: "2019-08-18T00:00:00Z",
      addedDate: "2019-08-18T00:00:00Z",
      description: `Go to: <a href="https://haveibeenpwned.com/account/${encodedUsername}" target="_blank" rel="noreferrer">https://haveibeenpwned.com/account/${encodedUsername}</a> for a manual check.<br/><br/>HaveIBeenPwned API key not set!<br/>Go to <a href="https://haveibeenpwned.com/API/Key" target="_blank" rel="noreferrer">https://haveibeenpwned.com/API/Key</a> to purchase an API key from HaveIBeenPwned.<br/><br/>`,
      logoPath: "vw_static/hibp.png",
      pwnCount: 0,
      dataClasses: ["Error - No API key set!"],
    },
  ]
}
