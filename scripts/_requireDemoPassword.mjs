/** Demo accounts must not ship with a committed password. */
export function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD
  if (!password || password.length < 12) {
    throw new Error(
      'Set DEMO_PASSWORD (min 12 chars) in the environment. Hardcoded demo passwords were removed.'
    )
  }
  return password
}

export function requireDemoEmail() {
  return process.env.DEMO_EMAIL || 'demo@frovo.com'
}
