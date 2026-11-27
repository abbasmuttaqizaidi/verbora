import * as leads from './leads'
import * as testimonials from './testimonials'
import * as courses from './courses'
import * as home from './home'

export * from './leads'
export * from './testimonials'
export * from './courses'
export * from './home'
export * from './client'

export const api = {
  leads,
  testimonials,
  courses,
  home,
}

export default api
