# Shabdashri Deployment Guide

This guide is written for this project specifically.

Your goal is:

- Public website live on your main domain
- Frontend deployed on Vercel
- Admin can add, edit, and delete data
- All categories, subcategories, products, and admin auth stored in Supabase
- Product images stored on GoDaddy Web Hosting Economy plan

## 1. What this project already does

This project already has:

- Supabase client setup in [src/lib/supabase.ts](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/lib/supabase.ts:1)
- Admin login using Supabase Auth in [src/pages/admin/Login.tsx](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/pages/admin/Login.tsx:1)
- Admin route protection in [src/components/admin/AdminGuard.tsx](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/components/admin/AdminGuard.tsx:1)
- Product/category/subcategory CRUD using Supabase tables in:
  - [src/lib/supabase/products.ts](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/lib/supabase/products.ts:1)
  - [src/lib/supabase/categories.ts](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/lib/supabase/categories.ts:1)
  - [src/lib/supabase/subcategories.ts](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/lib/supabase/subcategories.ts:1)
- Product image upload to Supabase Storage in [src/lib/supabase/storage.ts](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/lib/supabase/storage.ts:1)
- Vercel SPA rewrite config in [vercel.json](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/vercel.json:1)
- Supabase SQL migrations in [supabase/migrations](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/supabase/migrations)

## 2. The most important architecture decision

There are 2 valid ways to go live:

### Option A: Recommended

- Vercel hosts the frontend
- Supabase stores database, auth, and images
- GoDaddy is used only for domain/DNS

This is the easiest, most stable setup for this codebase because the current image upload already uses Supabase Storage.

### Option B: Your requested setup

- Vercel hosts the frontend
- Supabase stores database and auth
- GoDaddy Web Hosting Economy stores image files

This is possible, but it needs one extra backend layer.

Reason:

- The current admin form uploads directly from the browser to Supabase Storage
- A browser should not upload directly to your GoDaddy FTP credentials
- So you need a secure backend upload endpoint

That backend can be:

- A Vercel Serverless Function, or
- A Supabase Edge Function, or
- A separate Node backend

For this project, a Vercel Serverless Function is the simplest fit.

## 3. Current gaps in this codebase

### Image storage is still Supabase

The current upload function uses `supabase.storage.from('product-images')` in [src/lib/supabase/storage.ts](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/lib/supabase/storage.ts:22).

If you want GoDaddy file storage, this file must be replaced or extended.

### Supabase fallback keys are hardcoded

[src/lib/supabase.ts](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/lib/supabase.ts:3) contains fallback project values.

For production, always use environment variables only.

### Admin permission is broad

Your SQL policies currently allow any authenticated Supabase user to write data:

- [supabase/migrations/001_create_tables.sql](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/supabase/migrations/001_create_tables.sql:42)
- [supabase/migrations/003_add_subcategories.sql](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/supabase/migrations/003_add_subcategories.sql:36)
- [supabase/migrations/002_create_storage_bucket.sql](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/supabase/migrations/002_create_storage_bucket.sql:21)

That means any logged-in user can act like admin unless you restrict it further.

## 4. Recommended production architecture

Use this:

1. Vercel
   Frontend hosting
2. Supabase
   Database, authentication, RLS policies
3. GoDaddy Web Hosting Economy
   Image file storage only
4. GoDaddy DNS
   Domain points to Vercel

Data flow:

1. Admin logs in using Supabase Auth
2. Admin uploads image from admin panel
3. Upload goes to a secure backend function
4. Backend function uploads image to GoDaddy hosting folder
5. Backend returns the public image URL
6. Frontend saves that image URL in Supabase `products.preview_image`
7. Public site reads product data from Supabase and shows GoDaddy image URLs

## 5. Full setup from basic steps

### Step 1: Prepare Supabase project

In Supabase:

1. Create a new project
2. Open SQL Editor
3. Run your migrations in order:
   - `001_create_tables.sql`
   - `002_create_storage_bucket.sql`
   - `003_add_subcategories.sql`
   - `004_migrate_products_to_subcategories.sql`
   - `005_create_payment_orders.sql`
   - `006_add_10_rs_item.sql`
4. Go to Authentication
5. Create your admin user using email/password

Important:

- If you choose GoDaddy for images, the storage bucket migration is not required for product images anymore
- But leaving it will not break the project unless you later remove that code path

### Step 2: Add a proper admin restriction

Right now, any authenticated user can write data.

Better setup:

1. Create a `profiles` table or `admin_users` table in Supabase
2. Mark only your email as admin
3. Update RLS policies so only admin users can insert/update/delete

Minimum idea:

- Public users can `select`
- Only admin email or admin role can `insert/update/delete`

### Step 3: Prepare GoDaddy image folder

In GoDaddy Web Hosting Economy:

1. Open GoDaddy product page
2. Open your Web Hosting cPanel
3. Open File Manager or FTP Manager
4. Create a folder such as:
   - `public_html/uploads/products/`
5. Confirm the folder is publicly accessible

Example public URL pattern:

- `https://yourdomain.com/uploads/products/file-name.jpg`

If needed, create FTP access for uploads. GoDaddy currently supports FTP users on cPanel hosting, including Economy plans:

- https://www.godaddy.com/hi-in/help/add-ftp-users-to-my-web-hosting-cpanel-account-16044

### Step 4: Decide where the upload backend will live

Best choice for this project:

- Vercel Serverless Function

Why:

- Frontend is already on Vercel
- Secrets stay on server side
- The browser never sees FTP credentials

The function will:

1. Receive image file from admin panel
2. Validate image type and size
3. Upload file to GoDaddy via FTP/FTPS
4. Return the final public image URL

### Step 5: Update the admin image upload flow

Current upload flow:

- [src/components/admin/ProductForm.tsx](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/src/components/admin/ProductForm.tsx:168) uploads to Supabase Storage through `uploadProductImage()`

New upload flow should be:

1. Admin selects image
2. Frontend sends file to `/api/upload-image`
3. API uploads to GoDaddy
4. API returns a public URL
5. Product form saves that URL in Supabase

The database does not need to store the file binary.
It only needs the final image URL in `preview_image`.

### Step 6: Keep all business data in Supabase

Store these in Supabase:

- Admin users
- Categories
- Subcategories
- Products
- Payment/order data

Do not store these in GoDaddy hosting:

- Product records
- Login/auth data
- Order records

GoDaddy shared hosting should only hold static files if you choose this route.

### Step 7: Configure local environment

Use `.env` locally with values like:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_UPI_ID=your-upi-id
VITE_MERCHANT_NAME=Shabdashri
```

For backend upload function secrets, add server-side env vars in Vercel such as:

```env
GODADDY_FTP_HOST=your-ftp-host
GODADDY_FTP_USER=your-ftp-user
GODADDY_FTP_PASSWORD=your-ftp-password
GODADDY_PUBLIC_BASE_URL=https://yourdomain.com/uploads/products
```

Never place FTP credentials in client-side `VITE_` variables.

### Step 8: Deploy frontend to Vercel

Basic deploy flow:

1. Push project to GitHub
2. Import repository into Vercel
3. Framework preset should be Vite
4. Build command:
   - `npm run build`
5. Output directory:
   - `dist`
6. Add environment variables in Vercel Project Settings
7. Deploy

Your project already has matching Vercel config in [vercel.json](/d:/Praavi%20Demo%20websites/Current%20Client%20Websites/Shabdashri-main/Shabdashri-main/vercel.json:1).

### Step 9: Connect your main domain from GoDaddy to Vercel

Current Vercel docs say:

- Add the domain in Vercel project settings
- For an apex domain, Vercel commonly expects an `A` record
- For a subdomain like `www`, Vercel commonly expects a `CNAME`
- Use Vercel’s domain inspector to see the exact values for your project

Official docs:

- https://vercel.com/docs/domains/set-up-custom-domain
- https://vercel.com/docs/getting-started-with-vercel/use-existing

Typical flow:

1. Open your project in Vercel
2. Go to `Settings -> Domains`
3. Add:
   - `yourdomain.com`
   - `www.yourdomain.com`
4. Vercel will show the exact DNS records needed
5. Go to GoDaddy DNS management
6. Add the records exactly as Vercel shows
7. Wait for DNS verification
8. Set redirect:
   - either `www -> main`
   - or `main -> www`
9. Wait for SSL certificate to be issued automatically

Vercel’s February 26, 2026 guide shows this common pattern:

- apex domain: `A` record to `76.76.21.21`
- subdomain: `CNAME` to a Vercel hostname

But always trust the exact values shown in your Vercel project:

- https://vercel.com/docs/domains/set-up-custom-domain

### Step 10: Important DNS warning for your GoDaddy image folder

If your main domain points to Vercel, then `https://yourdomain.com/uploads/...` will no longer serve files from GoDaddy shared hosting.

So if you want GoDaddy to serve image files, use a separate hostname such as:

- `media.yourdomain.com`
- `files.yourdomain.com`
- `cdn.yourdomain.com`

Recommended setup:

1. Main website
   - `yourdomain.com` -> Vercel
2. Image hosting
   - `media.yourdomain.com` -> GoDaddy hosting

Then image URLs become:

- `https://media.yourdomain.com/uploads/products/file-name.jpg`

This is the cleanest way to use both Vercel and GoDaddy on the same brand domain.

### Step 11: Make admin live

Admin URLs in this app are:

- `/admin/login`
- `/admin/dashboard`
- `/admin/products`
- `/admin/categories`
- `/admin/subcategories`

After deploy:

1. Open `https://yourdomain.com/admin/login`
2. Log in with your Supabase admin user
3. Add categories
4. Add subcategories
5. Add products

### Step 12: Final production checks

Before launch, test:

1. Home page opens
2. Category pages open
3. Product page opens
4. Search works
5. Admin login works
6. Add product works
7. Edit product works
8. Delete product works
9. Image upload works
10. Uploaded image URL opens directly in browser
11. HTTPS works on main domain
12. `www` redirect works correctly

## 6. Best practical recommendation

If you want the fastest and safest launch:

- Use Vercel for frontend
- Use Supabase for database, auth, and image storage
- Use GoDaddy only for domain DNS

If you strictly want GoDaddy for image storage:

- Use Vercel for frontend
- Use Supabase for database/auth
- Use `media.yourdomain.com` on GoDaddy for images
- Add a secure upload backend function
- Save only the final image URL into Supabase

## 7. What I would change next in this repo

If we continue implementation, the next technical tasks should be:

1. Remove hardcoded Supabase fallback values
2. Add proper admin-role authorization in Supabase
3. Create a Vercel serverless upload API for GoDaddy image storage
4. Update `ProductForm` to use that API instead of Supabase Storage
5. Add safer delete handling so image files are also removed from GoDaddy when product is deleted
6. Add a small setup document for Vercel env vars and GoDaddy FTP credentials

## 8. Official references checked

- Vercel custom domain guide:
  https://vercel.com/docs/domains/set-up-custom-domain
- Vercel existing domain guide:
  https://vercel.com/docs/getting-started-with-vercel/use-existing
- GoDaddy FTP users on cPanel hosting:
  https://www.godaddy.com/hi-in/help/add-ftp-users-to-my-web-hosting-cpanel-account-16044
- Supabase storage upload reference:
  https://supabase.com/docs/guides/storage/uploads/standard-uploads
