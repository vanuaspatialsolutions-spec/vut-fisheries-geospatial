# CBFM Tracking & Monitoring Platform
### Vanuatu Department of Fisheries

A full-stack web platform for Community-Based Fisheries Management (CBFM) data collection, tracking, and monitoring across Vanuatu.

---

## Features

- **Real-time Dashboard** — Live statistics, charts, and KPIs across all provinces
- **Interactive Map** — Leaflet.js map showing community survey points, marine area polygons, and biological monitoring sites
- **Community Surveys** — Collect community profiles, governance status, LMMA info, fisher demographics
- **Marine Areas** — Record LMMAs, taboo areas, patrol zones with GeoJSON boundary upload
- **Biological Monitoring** — Reef fish surveys, coral cover, invertebrate counts, species observations
- **Dataset Management** — Upload ZIP, Shapefile, CSV, KML, GeoJSON files with rich metadata
- **Admin Review Workflow** — Users submit datasets for review; admins publish/reject
- **Role-based Access** — Admin, Staff, Community Officer roles
- **AWS S3 Storage** — Production file storage with pre-signed download URLs

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Leaflet.js, Recharts, Socket.IO |
| Backend | Node.js, Express, Sequelize ORM |
| Database | PostgreSQL 15 + PostGIS |
| File Storage | AWS S3 (production) / local disk (development) |
| Auth | JWT (7-day tokens) |
| Deployment | Docker Compose + Nginx |

---

## Quick Start (Development)

### 1. Start the database

```bash
cd cbfm-platform
docker compose -f docker-compose.dev.yml up -d
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env
# Edit .env with your settings
npm install
npm run seed    # Creates admin user
npm run dev     # Starts on :5000
```

### 3. Start frontend

```bash
cd frontend
npm install
npm run dev     # Starts on :3000
```

Open http://localhost:3000

Default admin: `admin@fisheries.gov.vu` / `Admin@CBFM2024`

---

## Production Deployment (Docker)

```bash
# 1. Copy and configure environment
cp .env.example .env
nano .env    # Set all variables

# 2. Build and start all services
docker compose up -d --build

# 3. Check logs
docker compose logs -f backend
```

The application will be available on port 80.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Secret key for JWT tokens (min 64 chars) |
| `FRONTEND_URL` | Frontend URL for CORS (e.g. https://cbfm.fisheries.gov.vu) |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region (default: ap-southeast-2) |
| `AWS_S3_BUCKET` | S3 bucket name for dataset storage |
| `ADMIN_EMAIL` | Initial admin email |
| `ADMIN_PASSWORD` | Initial admin password |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/surveys` | List community surveys |
| POST | `/api/surveys` | Submit new survey |
| GET | `/api/surveys/map` | Map point data |
| GET | `/api/marine/geojson` | Marine areas as GeoJSON |
| POST | `/api/marine` | Create marine area |
| GET | `/api/monitoring` | List bio monitoring |
| POST | `/api/monitoring` | Submit monitoring record |
| POST | `/api/datasets/upload` | Upload dataset file |
| PUT | `/api/datasets/:id/publish` | Publish dataset (staff+) |
| GET | `/api/datasets/:id/download` | Download dataset file |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access, user management, publish/unpublish datasets, delete records |
| **Staff** | Publish datasets, review submissions, view all records |
| **Community Officer** | Submit surveys/monitoring, upload datasets (draft), submit for review |

---

## Supported File Formats

| Format | Extension |
|--------|-----------|
| ZIP archive | `.zip` |
| Shapefile | `.shp`, `.dbf`, `.shx`, `.prj` |
| CSV | `.csv` |
| KML | `.kml` |
| GeoJSON | `.geojson`, `.json` |

Maximum upload size: **500 MB**

---

## AWS S3 Setup

1. Create an S3 bucket (e.g. `cbfm-vanuatu-datasets`) in `ap-southeast-2`
2. Create an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions on the bucket
3. Add the credentials to your `.env` file

---

## Data Collection Forms

### Community Survey
Collects: province, island, community, fisher demographics, CBFM committee status, taboo area info, challenges, training received

### Marine Area
Collects: LMMA/taboo area boundaries (GeoJSON), area size, management status, habitat types, patrol frequency, closure dates

### Biological Monitoring
Collects: reef fish counts/biomass, coral cover %, invertebrate densities, species observations, reef health score, threats observed

---

*Developed for the Vanuatu Department of Fisheries — CBFM Tracking & Monitoring Programme*
