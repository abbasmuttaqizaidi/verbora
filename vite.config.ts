import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import crypto from 'node:crypto'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-api-middlewares',
      configureServer(server) {
        server.middlewares.use('/api/home-data', async (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method Not Allowed' }))
            return
          }

          try {
            const supabaseUrl =
              process.env.VITE_SUPABASE_URL || 'https://akutnisipdhjrrwnupeb.supabase.co'
            const supabaseAnonKey =
              process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nIVc7DMCydkRh3jDWP0OPA_tMfbK1Zj'

            const courseCols =
              'id,title,tagline,short,summary,fee_amount,discount_percent,display_order,created_at,updated_at'
            const testiCols =
              'id,name,role,image,video,text,badge,is_active,is_spotlight,display_order,created_at'
            const headers = {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
              Accept: 'application/json',
            }

            const [coursesRes, testimonialsRes] = await Promise.all([
              fetch(`${supabaseUrl}/rest/v1/courses?select=${courseCols}&order=display_order.asc`, { headers }),
              fetch(
                `${supabaseUrl}/rest/v1/testimonials?select=${testiCols}&is_active=eq.true&order=display_order.asc,created_at.desc`,
                { headers }
              ),
            ])

            if (!coursesRes.ok || !testimonialsRes.ok) {
              res.statusCode = !coursesRes.ok ? coursesRes.status : testimonialsRes.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Upstream Supabase query failed' }))
              return
            }

            const [courses, testimonials] = await Promise.all([
              coursesRes.json(),
              testimonialsRes.json(),
            ])

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
            res.end(JSON.stringify({ courses, testimonials }))
          } catch (err: any) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err?.message || 'Server error' }))
          }
        })

        server.middlewares.use('/api/delete-media', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method Not Allowed' }))
            return
          }

          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { public_id, resource_type = 'video' } = JSON.parse(body || '{}')
              if (!public_id) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing public_id' }))
                return
              }

              const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'mtjv4nu9'
              const apiKey = process.env.CLOUDINARY_API_KEY || '166842895279799'
              const apiSecret = process.env.CLOUDINARY_API_SECRET || 'rmDaG9U92ql1w0M3220JV14ZDcA'

              const timestamp = Math.round(new Date().getTime() / 1000)
              const signaturePayload = `public_id=${public_id}&timestamp=${timestamp}${apiSecret}`
              const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex')

              const formData = new URLSearchParams()
              formData.append('public_id', public_id)
              formData.append('api_key', apiKey)
              formData.append('timestamp', timestamp.toString())
              formData.append('signature', signature)

              const destroyEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/destroy`
              const cldRes = await fetch(destroyEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
              })
              const data = await cldRes.json()
              res.setHeader('Content-Type', 'application/json')
              if (data.result === 'ok' || data.result === 'not found') {
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, result: data.result }))
              } else {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: data.result }))
              }
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err?.message || 'Server error' }))
            }
          })
        })
      }
    }
  ],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-tanstack': ['@tanstack/react-router'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
