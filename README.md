# Smart Salary Processor

A modern, responsive payroll web application with automated salary calculation.

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env        # edit MONGO_URI and JWT_SECRET
npm run dev                 # starts on http://localhost:5000
```

### Frontend
Open `frontend/index.html` in a browser, or serve with any static server:
```bash
npx serve frontend
```

## Salary Calculation Logic
- **Overtime**: Hours > 160 → 1.5× hourly rate
- **Sales Bonus**: 5% of sales amount
- **Performance Bonus**: Up to 20% of base salary (based on score)
- **Tax**: 10% of gross salary
- **Net** = Base + Bonus − Tax − Deductions

## Pages
| Page | Description |
|------|-------------|
| `index.html` | Landing page |
| `login.html` | Login / Register / Forgot Password |
| `dashboard.html` | Main dashboard with stats and quick actions |
| `salary.html` | Enter data, build salary, view history |
| `profile.html` | Edit personal and bank details |

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register employee |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/forgot-password` | Forgot password |
| GET | `/api/employee/me` | Get profile |
| PUT | `/api/employee/me` | Update profile |
| POST | `/api/salary/enter-data` | Save work data |
| POST | `/api/salary/build/:month` | Process & credit salary |
| GET | `/api/salary/history` | Salary history |
