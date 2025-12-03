# User Roles System - Setup Guide

## Overview
A comprehensive role-based access control (RBAC) system has been added to the stock tracking application with three permission levels:

- **👁️ Viewer** - Read-only access
- **👤 Operator** - Can perform transactions
- **👑 Admin** - Full system access

## Setup Instructions

### 1. Run SQL Script in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase-setup.sql`
4. Copy the **USER ROLES SYSTEM** section (starting from line 19)
5. Paste and execute in the SQL Editor

This will create:
- `users` table with columns: id, username, role, created_at, updated_at
- A default admin user (username: "admin")
- Proper indexes and Row Level Security policies

### 2. Verify Table Creation

In Supabase Dashboard → Table Editor:
- You should see a new `users` table
- It should contain one row: `admin` with role `admin`

### 3. Test the System

1. **Deploy the changes** - The code has been pushed to your repository
2. **Access the app** - Go to your deployed URL
3. **Login as admin**:
   - Enter username: `admin`
   - You should see an **ADMIN** badge
4. **Access admin panel**:
   - Go to `/view` page
   - Click **👥 Users** button
   - You should see the user management interface

## User Roles & Permissions

### 👁️ Viewer Role
**Can:**
- View all stock records
- View inventory data
- Check part numbers and locations

**Cannot:**
- Perform stock transactions (add/remove items)
- Use batch mode
- Access inventory management pages
- Access admin features

### 👤 Operator Role (Default for new users)
**Can:**
- Everything a Viewer can do
- Perform stock transactions
- Use batch mode
- Add/check/delete inventory items

**Cannot:**
- Manage other users
- Change user roles
- Access admin panel

### 👑 Admin Role
**Can:**
- Everything an Operator can do
- Access user management (`/admin` page)
- Create, update, and delete users
- Change user roles
- Import/export inventory data
- Full system access

## Managing Users

### Accessing User Management
1. Login as an admin user
2. Go to `/view` page
3. Click **👥 Users** button
4. Or directly navigate to `/admin`

### Creating New Users
New users are automatically created when they first login:
- They enter their username on the main page
- System creates them with **Operator** role by default
- Admins can then change their role as needed

### Changing User Roles
1. Go to `/admin` page
2. Find the user in the list
3. Use the dropdown to select new role:
   - Viewer
   - Operator
   - Admin
4. Change is applied immediately

### Deleting Users
1. Go to `/admin` page
2. Find the user in the list
3. Click **Delete** button
4. Confirm the deletion
5. User is permanently removed from the system

## UI Changes

### Role Badges
Users will see their role displayed as a colored badge:
- 🟣 **ADMIN** - Purple background
- 🔵 **OPERATOR** - Blue background
- ⚪ **VIEWER** - Gray background

Badges appear:
- Next to username on part number entry screen
- In batch mode header
- On all transaction pages

### Access Restrictions
- **Viewers** see disabled submit buttons with warning messages
- **Non-admins** see "Access Denied" page when accessing `/admin`
- **Viewers/Operators** see "Access Denied" when accessing `/manage`
- Navigation links automatically adapt based on user role

## API Endpoints

### `/api/getUser` (POST)
Get or create user by username
```json
Request: { "username": "john" }
Response: { "username": "john", "role": "operator", "isNewUser": true }
```

### `/api/listUsers` (GET)
Get all users (admin only recommended)
```json
Response: { "users": [{ "id": "...", "username": "...", "role": "..." }] }
```

### `/api/updateUserRole` (POST)
Update user's role
```json
Request: { "username": "john", "newRole": "admin" }
Response: { "message": "User role updated successfully" }
```

### `/api/deleteUser` (POST)
Delete a user
```json
Request: { "username": "john" }
Response: { "message": "User deleted successfully" }
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Default Admin**: Change the default admin username if needed by updating the SQL script
2. **Row Level Security**: Currently set to allow all operations - refine policies in production
3. **Client-side checks**: Role checks use localStorage - add server-side validation for production
4. **Password protection**: Import page uses simple password - consider more robust auth
5. **API security**: Consider adding authentication tokens for API endpoints

## Troubleshooting

### User role not loading
- Check browser console for errors
- Verify Supabase connection
- Clear localStorage: `localStorage.clear()`
- Login again

### Access Denied on admin page
- Verify your role is set to `admin` in Supabase
- Check localStorage: `localStorage.getItem('stockTrackerUserRole')`
- If wrong, delete and login again

### New users not being created
- Check Supabase logs for errors
- Verify `users` table exists
- Check API endpoint `/api/getUser` is working

## Future Enhancements

Potential improvements for production:
1. Add email-based authentication (Supabase Auth)
2. Implement proper session management
3. Add audit logging for user actions
4. Email notifications for role changes
5. Password reset functionality
6. Multi-factor authentication
7. IP-based access restrictions
8. Auto-logout after inactivity

## Support

For issues or questions:
1. Check Supabase logs in Dashboard
2. Check browser console for client errors
3. Verify database table structure
4. Test API endpoints individually
