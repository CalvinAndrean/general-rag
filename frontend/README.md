# General RAG Frontend UI

React frontend bundled with **Rsbuild**, styled with **TailwindCSS** and **shadcn/ui** design system.

## Setup & Running

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `PUBLIC_API_URL` points to your backend:
```env
PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 2. Install Dependencies & Start Dev Server
```bash
npm install
npm run dev
```

### 3. Build Production Bundle
```bash
npm run build
```
