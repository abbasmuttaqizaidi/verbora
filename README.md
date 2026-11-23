# VERBORA website

A responsive marketing website inspired by the supplied VERBORA design reference.

## Stack

- React 19, TypeScript and Vite
- TanStack Router (homepage and individual course routes)
- Custom responsive CSS and Lucide icons
- Static output ready for Sites hosting

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The build creates `dist/` plus explicit deep-link entrypoints for `/courses/<slug>`.

## Demo enquiry integration

The supplied design includes a free-demo lead form. This project validates the
name, email, phone and course fields. In the default preview, **no contact data
is transmitted or stored**: an honest confirmation explains that the backend
is not yet connected.

To receive demo bookings, set `VITE_DEMO_ENDPOINT` before building. The form
sends a JSON POST body with `name`, `email`, `phone` and `course`, and treats 2xx
HTTP responses as success. The endpoint must be implemented by the client and
configured with appropriate CORS, anti-spam controls and lawful data handling.

## Content to confirm before client launch

- Authentic VERBORA logo and photographs (the hero currently uses a crop of the
  screenshot supplied for this brief).
- Real trainer, program and enrollment details.
- Approved student testimonials, numbers and any placement affiliations.
- Social profile URLs and privacy/terms pages.
- CRM/email backend and a confirmed contact inbox.

Until verified, the testimonials are explicitly labelled as examples; the page
does not repeat unverified placement logos or achievement statistics.
