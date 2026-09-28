/**
 * links.ts — cross-product URLs.
 *
 * Pollux (this app) is the company side; seafarers live in Cástor, a separate
 * product with its own origin (PBS-DOMAIN-ARCHITECTURE.md §3: one origin per
 * product, path routing only). Both share the same backend + database, so a
 * seafarer's profile updated in Cástor is what a company sees here.
 */

export const CASTOR_URL = 'https://castor-app.com/'
export const CASTOR_LOGIN_URL = 'https://castor-app.com/login'
export const PBS_URL = 'https://www.pbtradingsolutions.com/'
