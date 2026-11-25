import * as bookings from './bookings'
import * as contact from './contact'
import * as subscribers from './subscribers'

export * from './bookings'
export * from './contact'
export * from './subscribers'
export * from './client'

export const api = {
  bookings,
  contact,
  subscribers,
}

export default api
