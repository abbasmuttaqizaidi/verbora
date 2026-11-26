import * as bookings from './bookings'
import * as contact from './contact'
import * as subscribers from './subscribers'
import * as testimonials from './testimonials'

export * from './bookings'
export * from './contact'
export * from './subscribers'
export * from './testimonials'
export * from './client'

export const api = {
  bookings,
  contact,
  subscribers,
  testimonials,
}

export default api
