import crypto from 'node:crypto'

export const config = {
  runtime: 'nodejs',
}

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { public_id, resource_type = 'video' } = req.body || {}

    if (!public_id) {
      return res.status(400).json({ error: 'Missing public_id' })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || 'mtjv4nu9'
    const apiKey = process.env.CLOUDINARY_API_KEY || '166842895279799'
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'rmDaG9U92ql1w0M3220JV14ZDcA'

    if (!apiSecret || !apiKey) {
      return res.status(500).json({ error: 'Cloudinary server credentials not configured' })
    }

    const timestamp = Math.round(new Date().getTime() / 1000)

    // Cloudinary SHA1 signature: sort parameters alphabetically
    const signaturePayload = `public_id=${public_id}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex')

    const formData = new URLSearchParams()
    formData.append('public_id', public_id)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)

    const destroyEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/destroy`

    const cloudinaryRes = await fetch(destroyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const data = await cloudinaryRes.json()

    if (data.result === 'ok' || data.result === 'not found') {
      return res.status(200).json({ success: true, result: data.result })
    } else {
      return res.status(400).json({ success: false, error: data.result || 'Failed to destroy asset' })
    }
  } catch (error: any) {
    console.error('Error in /api/delete-media:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}
