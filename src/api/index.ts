import * as bookings from './bookings'
import * as contact from './contact'
import * as subscribers from './subscribers'
import * as testimonials from './testimonials'
import * as courses from './courses'
import * as home from './home'

export * from './bookings'
export * from './contact'
export * from './subscribers'
export * from './testimonials'
export * from './courses'
export * from './home'
export * from './client'

export const api = {
  bookings,
  contact,
  subscribers,
  testimonials,
  courses,
  home,
}

export default api
