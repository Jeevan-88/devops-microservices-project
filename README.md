# LeadGen Pro - Microservices Lead Generation Platform

A complete lead generation SaaS platform built with microservices architecture, featuring automated lead scoring, email campaigns, and analytics.

## 🚀 Project Structure

```
leadgen-platform/
├── frontend/
│   ├── portfolio/          # Personal portfolio website
│   ├── blog/              # Technical blog
│   └── dashboard/         # Lead generation platform UI
├── services/
│   ├── auth-service/      # Authentication & OAuth (Port 3001)
│   ├── lead-service/      # Lead management (Port 3002)
│   ├── email-service/     # Email automation (Port 3003)
│   ├── blog-service/      # Blog CMS (Port 3005)
│   └── api-gateway/       # Nginx reverse proxy
├── docker-compose.yml     # Docker orchestration
└── README.md
```

## 🎯 Features

### Portfolio Website
- ✨ Dark mode with glassmorphism design
- 🎨 Smooth animations and particle effects
- 📱 Fully responsive
- 💼 Skills showcase and project gallery

### Blog System
- 📝 Content management system
- 🔍 Search and category filtering
- 📖 Markdown support (ready for integration)
- 🎨 Modern card-based layout

### Lead Generation Platform
- 🎯 AI-powered lead scoring
- 📊 Real-time analytics dashboard
- 📧 Email automation and campaigns
- 🔐 Multi-provider OAuth (Google, Facebook)
- 💳 Payment integration (Stripe ready)
- 🔄 RESTful APIs

## 🛠️ Tech Stack

### Frontend
- HTML5, CSS3, Vanilla JavaScript
- Glassmorphism UI design
- Responsive layouts

### Backend Microservices
- **Node.js/Express** - Auth, Lead, Email services
- **MongoDB** - Blog data storage
- **PostgreSQL** - User, lead, and subscription data
- **Redis** - Session management and caching
- **Nginx** - API Gateway & reverse proxy

### Authentication
- JWT tokens (access & refresh)
- OAuth 2.0 (Google, Facebook)
- bcrypt password hashing

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Service orchestration
- Multi-stage builds for optimization

## 📋 Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- Git (for cloning)

## 🚀 Quick Start

### 1. Clone the Repository (if applicable)
```bash
cd C:\Users\Jeevan Yadav\.gemini\antigravity\scratch\leadgen-platform
```

### 2. Configure Environment Variables

Before running, update the following in `docker-compose.yml`:

**OAuth Credentials:**
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`

**Email SMTP:**
- `SMTP_USER` - Your Gmail address
- `SMTP_PASS` - Gmail App Password ([Generate here](https://myaccount.google.com/apppasswords))

**Security (Production):**
- Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong random strings

### 3. Build and Start All Services

```bash
docker-compose up --build
```

This will:
- Build all microservice containers
- Start PostgreSQL, MongoDB, and Redis
- Launch all backend services
- Start Nginx reverse proxy
- Initialize database schemas

### 4. Access the Applications

Once running, access:

- **Portfolio**: http://localhost
- **Blog**: http://localhost/blog
- **Dashboard**: http://localhost/dashboard
- **API Health**: http://localhost/api/health

### 5. Stop All Services

```bash
docker-compose down
```

To remove all data volumes:
```bash
docker-compose down -v
```

## 📡 API Endpoints

### Auth Service (Port 3001)
```
POST   /api/auth/register          - Register with email/password
POST   /api/auth/login             - Login with email/password
POST   /api/auth/refresh-token     - Refresh access token
POST   /api/auth/logout            - Logout user
GET    /api/auth/me                - Get current user
GET    /api/auth/google            - Google OAuth
GET    /api/auth/facebook          - Facebook OAuth
```

### Lead Service (Port 3002)
```
POST   /api/leads                  - Create new lead
GET    /api/leads                  - Get all leads (with pagination)
GET    /api/leads/:id              - Get single lead
PUT    /api/leads/:id              - Update lead
DELETE /api/leads/:id              - Delete lead
POST   /api/leads/:id/score        - Recalculate lead score
GET    /api/leads/stats/overview   - Get analytics
```

### Email Service (Port 3003)
```
POST   /api/email/send             - Send single email
POST   /api/email/campaign         - Create email campaign
GET    /api/email/campaigns        - Get all campaigns
GET    /api/email/stats            - Get email statistics
```

### Blog Service (Port 3005)
```
POST   /api/blog/posts             - Create blog post
GET    /api/blog/posts             - Get all posts
GET    /api/blog/posts/:slug       - Get post by slug
PUT    /api/blog/posts/:id         - Update post
DELETE /api/blog/posts/:id         - Delete post
```

## 🎨 Features Overview

### AI Lead Scoring
Automatic scoring based on:
- Email domain quality (20 points)
- Phone number presence (15 points)
- Company information (25 points)
- Job title (20 points)
- Website (10 points)
- Detailed notes (10 points)

**Maximum Score**: 100 points

### Email Automation
- Transactional emails (welcome, verification)
- Campaign management
- Template system
- Send tracking and statistics
- Nodemailer integration

### Security
- JWT access tokens (15min expiry)
- Refresh tokens (7-day expiry)
- Password hashing with bcrypt (10 rounds)
- Redis-based session management
- OAuth 2.0 integration

## 🗄️ Database Schemas

### PostgreSQL Tables
- `users` - User accounts and authentication
- `leads` - Lead information and scores
- `email_logs` - Email delivery tracking
- `campaigns` - Email campaign data

### MongoDB Collections
- `posts` - Blog posts and content

## 🔧 Development

### Running Individual Services

```bash
# Auth service
cd services/auth-service
npm install
npm start

# Lead service
cd services/lead-service
npm install
npm start
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f lead-service
```

### Rebuilding After Changes

```bash
# Rebuild all
docker-compose up --build

# Rebuild specific service
docker-compose up --build auth-service
```

## 📊 Monitoring

### Service Health Checks

Each service has a `/health` endpoint:
```bash
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # Lead
curl http://localhost:3003/health  # Email
curl http://localhost:3005/health  # Blog
```

### Database Access

**PostgreSQL:**
```bash
docker exec -it leadgen-postgres psql -U postgres -d leadgen
```

**MongoDB:**
```bash
docker exec -it leadgen-mongo mongosh leadgen-blog
```

**Redis:**
```bash
docker exec -it leadgen-redis redis-cli
```

## 🚢 Deployment

### Production Considerations

1. **Environment Variables**: Use `.env` files instead of hardcoding in docker-compose.yml
2. **SSL/TLS**: Configure HTTPS with Let's Encrypt
3. **Secrets**: Use Docker secrets or cloud secret managers
4. **Scaling**: Use Kubernetes or Docker Swarm for orchestration
5. **Monitoring**: Add prometheus, Grafana, or cloud monitoring
6. **Backups**: Implement automated database backups

### Cloud Deployment Options

- **AWS**: ECS/EKS with RDS and ElastiCache
- **Azure**: Container Instances with Azure Database
- **GCP**: Cloud Run with Cloud SQL
- **DigitalOcean**: App Platform with managed databases

## 👨‍💻 Author

**Avula Jeevan Yadav**
- Email: jeevanyadav2008@gmail.com
- GitHub: [@Jeevan-88](https://github.com/Jeevan-88)
- LinkedIn: [in/jeevan8](https://linkedin.com/in/jeevan8)
- Location: Hyderabad, India

**Education**: B.Tech Computer Science & Engineering, Lovely Professional University (Expected 2027)

## 📄 License

This project is for educational and portfolio purposes.

## 🙏 Acknowledgments

Built with modern web technologies and microservices best practices for demonstrating full-stack development capabilities.

---

**Status**: Demo/Portfolio Project  
**Last Updated**: December 2024
