# Deployment

## Recommended: Render

This app is a full-stack Node/Express service that also serves the built React frontend, so Render is the simplest deployment target.

1. Push this project to GitHub.
2. Open Render and create a new Blueprint/Web Service from the repo.
3. Render will detect `render.yaml`.
4. Confirm these settings:
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health`
5. Deploy and use the generated Render URL.

## Optional PostgreSQL

The app works without a database by storing analysis runs in `data/submissions.json`. For a stronger production deployment, create a PostgreSQL database and set:

```bash
DATABASE_URL=postgres://user:password@host:5432/database
```

The server automatically creates the `screening_runs` table when `DATABASE_URL` is present.

## Important Upload Note

Uploaded files are stored in the server filesystem. On most cloud platforms this storage can be temporary unless persistent disk/object storage is configured. For a demo submission this is acceptable, but for production use, connect persistent storage such as S3, Cloudinary, or a mounted Render disk.
