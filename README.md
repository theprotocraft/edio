# 🎬 Edio – Setup Guide

Welcome to **Edio**, the collaborative platform designed for YouTubers and editors. This guide helps you configure the project locally with Supabase and initialize the database schema.

---

## ⚙️ Environment Setup

### 1. Create a Supabase Project

If you haven’t already, create a free Supabase project at [supabase.com](https://supabase.com).

---

### 2. Get Your Supabase API Credentials

- Open your Supabase project dashboard
- Go to **Settings → API**
- Copy the following:
  - **Project URL**
  - **Anon Public Key**

---

### 3. Create `.env.local`

In the root directory of your project, create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

🗃️ Database Setup (Supabase SQL)
1. Initialize the Schema
Use the provided database-schema.sql file to set up all required tables and permissions.

Steps:
Go to your Supabase project dashboard

Click SQL Editor in the sidebar

Create a New Query

Paste the contents of database-schema.sql

Click Run
