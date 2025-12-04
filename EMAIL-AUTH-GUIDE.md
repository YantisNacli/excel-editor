# Email-Based Authentication Setup Guide

## ✅ Changes Completed

### Backend (Complete)
- ✅ Database schema updated: `users` table now has `email` and `name` columns
- ✅ All API routes updated to use email authentication
- ✅ `/api/getUser` - Returns 403 if email not authorized
- ✅ `/api/createUser` - New endpoint to add users
- ✅ `/api/updateUserRole` - Uses email parameter
- ✅ `/api/deleteUser` - Uses email parameter
- ✅ `/api/listUsers` - Returns email and name

### Frontend (Complete)
- ✅ ExcelEditor: Auto-detects email on load, no name question
- ✅ Admin page: Shows email + name columns
- ✅ Admin page: "Add User" button with email/name/role form
- ✅ localStorage: Uses `stockTrackerUserEmail` instead of username

## 🚀 How to Give Yourself Admin Access

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `set-admin.sql` file
4. Replace `your-email@example.com` with your actual email
5. Replace `Your Name` with your actual name
6. Run the SQL script

### Option 2: Using Admin Page (After Initial Setup)
1. First, use Option 1 to create your admin account
2. Go to `/admin` page
3. Click "**+ Add User**" button
4. Enter email, name, and select role
5. Click "Create User"

## 📋 How It Works Now

### User Flow
1. **First Visit**: User is prompted to enter their email address
2. **Authentication**: System checks if email exists in database
3. **Access Granted**: If email exists, user is authenticated with their role
4. **Access Denied**: If email doesn't exist, user sees "Access Denied" message

### No More Name Question
- The old "Please enter your name" screen is gone
- Email is detected automatically from localStorage or prompt
- User's display name comes from the `name` field in database

### Admin Features
- **Add Users**: Use the "+ Add User" button in `/admin`
- **Change Roles**: Dropdown next to each user
- **Delete Users**: Red "Delete" button
- **View User Info**: Shows email, name, role, and creation date

## 🔐 Security Features

### Whitelist-Only Access
- Only users with emails in the database can access the system
- No automatic user creation
- Admins must manually add users via `/admin` page

### Role-Based Permissions
- **Viewer**: Read-only access to records
- **Operator**: Can perform stock transactions
- **Admin**: Full access including user management

## 📝 Example: Adding a New User

1. Go to `/admin` (must be logged in as admin)
2. Click "+ Add User"
3. Enter:
   - Email: `john.doe@company.com`
   - Name: `John Doe`
   - Role: `operator` (or viewer/admin)
4. Click "Create User"
5. John can now log in with his email address

## ⚙️ Technical Details

### localStorage Keys
- `stockTrackerUserEmail` - User's email address
- `stockTrackerUserName` - User's display name
- `stockTrackerUserRole` - User's role (viewer/operator/admin)

### API Endpoints
```javascript
// Get user by email (authentication)
POST /api/getUser
Body: { email: "user@example.com" }
Response: { email, name, role, isNewUser: false }

// Create new user (admin only)
POST /api/createUser
Body: { email: "new@example.com", name: "New User", role: "operator" }

// Update user role (admin only)
POST /api/updateUserRole
Body: { email: "user@example.com", newRole: "admin" }

// Delete user (admin only)
POST /api/deleteUser
Body: { email: "user@example.com" }

// List all users (admin only)
GET /api/listUsers
Response: { users: [{ id, email, name, role, created_at, updated_at }] }
```

## 🎯 Next Steps

1. **Run `set-admin.sql`** to give yourself admin access
2. **Test the login flow** by visiting the homepage
3. **Add other users** via the `/admin` page
4. **Deploy changes** to Vercel

## 🐛 Troubleshooting

### "Access Denied" message
- Make sure your email is in the database
- Run the `set-admin.sql` script with your email
- Check for typos in your email address

### Can't access /admin page
- Make sure your role is set to 'admin' in the database
- Clear localStorage and log in again
- Verify with: `SELECT * FROM users WHERE email = 'your-email@example.com';`

### Email prompt keeps appearing
- Check browser console for errors
- Make sure Supabase connection is working
- Verify `/api/getUser` endpoint is returning data
