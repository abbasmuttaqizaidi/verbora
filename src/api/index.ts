import * as leads from './leads'
import * as testimonials from './testimonials'
import * as courses from './courses'
import * as home from './home'
import * as trainer from './trainer'

export * from './leads'
export * from './testimonials'
export * from './courses'
export * from './home'
export * from './trainer'
export * from './client'

export const api = {
  leads,
  testimonials,
  courses,
  home,
  trainer,
}

export default api
