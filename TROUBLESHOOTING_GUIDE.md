# Troubleshooting Guide - Authentication System

## 🔍 Debugging Steps

### Step 1: Check Browser Console
Press `F12` or `Cmd+Option+I` to open developer tools and check the Console tab for errors.

**Common errors you might see:**
- `auth/user-not-found` - Email doesn't exist in Firebase Auth
- `auth/wrong-password` - Password is incorrect
- `auth/email-already-in-use` - Email already has an account
- `Firestore: Missing or insufficient permissions` - Security rules issue
- `fetch failed` - Network or CORS issue

### Step 2: Check Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **wirebazar-c1322**
3. Check **Authentication** → **Users** to see created accounts
4. Check **Firestore Database** to verify data structure

### Step 3: Check Local Storage
In browser DevTools → Application → Local Storage → find entries like:
- `wirebazaar-user` - Current user profile
- `wirebazaar-otp` - OTP state
- `owner-dashboard-authenticated` - Admin login state

---

## ❌ Common Problems & Solutions

### Problem 1: "Sign Up Button Does Nothing"

**Symptoms:**
- Click Sign Up, nothing happens
- No error message appears
- Page doesn't load OTP screen

**Solutions:**
1. **Check console (F12)** for JavaScript errors
2. **Verify Firebase is initialized:**
   - Check Network tab → see if Firebase requests are sent
   - Check if firebase-init.ts is loading correctly

3. **Check form validation:**
   - Make sure all fields are filled
   - Email must be valid format (contain @)
   - Password must be at least 6 characters
   - Phone must be 10 digits (India format)

4. **Check Firebase Auth is enabled:**
   - Go to Firebase Console → Authentication
   - Verify "Email/Password" is enabled

**Test:**
```javascript
// Type in browser console:
const auth = require('./lib/firebase').auth;
console.log(auth.currentUser); // Should show auth object
```

---

### Problem 2: "OTP Verification Always Fails"

**Symptoms:**
- Enter 123456 and get "Incorrect OTP" error
- Can't proceed past OTP screen
- OTP keeps showing as invalid

**Solutions:**
1. **Verify OTP format:**
   - Must be exactly 6 digits: `123456`
   - Don't include spaces or dashes
   - Check that input field shows correct number

2. **Check UserAuthContext:**
   - Open `src/context/UserAuthContext.tsx`
   - Find `const TEST_OTP = "123456"`
   - Make sure it's exactly this value

3. **Check OTP hashing:**
   - OTP is hashed before comparison
   - Make sure you're entering the plaintext OTP, not hash
   - Test with exact string: `123456`

4. **Check OTP expiration:**
   - OTP expires after 10 minutes
   - If you waited too long, request new OTP
   - Check error message for expiration warning

**Test:**
```javascript
// In UserAuthContext, add console log:
console.log('OTP hash expected:', pendingOtp.otpHash);
console.log('OTP value entered:', otp);
// Compare if they match
```

---

### Problem 3: "Same User Gets Different UID After Re-login"

**Symptoms:**
- User A signs up with uid: abc123
- User A logs out and logs back in
- Now user A has uid: xyz789
- User A can't see their orders

**Solutions:**
1. **Check Firebase Auth:**
   - Go to Firebase Console → Authentication → Users
   - Search for user's email
   - Verify only ONE user account exists with that email
   - If multiple accounts exist, DELETE duplicates

2. **Check Firestore profiles:**
   - Go to Firestore → user_profiles collection
   - Look for documents with same email
   - Should only be ONE with that email
   - Delete duplicates if they exist

3. **Check code in UserAuthContext:**
   - The `onAuthStateChanged` listener should use Firebase's UID
   - Don't create your own UID system
   - Trust Firebase's auto-generated UID

4. **Clear browser storage:**
   - Press F12 → Application
   - Click Local Storage
   - Delete `wirebazaar-user` and `wirebazaar-otp`
   - Refresh page and try again

**Root Cause Check:**
```javascript
// If you see this in browser console repeatedly:
console.log('New user UID:', firebaseUser.uid);
// The UID should NEVER change for same email

// If UID changes, check:
// 1. Is the email truly the same?
// 2. Is there a code path creating new user?
// 3. Is localStorage being cleared unexpectedly?
```

---

### Problem 4: "Orders/Inquiries Not Showing After Login"

**Symptoms:**
- User logs in successfully
- But "My Orders" page shows "No orders yet"
- But user DID create an order before
- Order exists in Firestore but doesn't appear

**Solutions:**
1. **Verify user is authenticated:**
   ```javascript
   // In browser console:
   const { useUserAuth } = require('./context/UserAuthContext');
   const { user, isAuthenticated } = useUserAuth();
   console.log('User:', user);
   console.log('Is Authenticated:', isAuthenticated);
   console.log('User UID:', user?.id);
   ```

2. **Check if profile is marked as verified:**
   - User must have `verified: true` in Firestore
   - Without this, orders won't load
   - Go to Firestore → user_profiles/{uid}
   - Verify `verified` field is `true` (boolean, not string)

3. **Check orders in Firestore:**
   - Go to Firestore → orders collection
   - Find orders with matching userId
   - Verify userId matches user.id exactly
   - If userId is different, data won't match

4. **Check loading state:**
   - Orders might still be loading
   - Check if `isLoadingUserData` is true
   - Wait a few seconds for data to load
   - Check Network tab to see Firestore requests

5. **Check Firestore Rules:**
   - Make sure rules allow reading user's own orders
   - Try with Admin SDK to test data access
   - Check Rules playground in Firebase Console

**Test:**
```javascript
// Add to browser console:
// Check if orders are being queried
const { getUserOrders } = require('./lib/firebase-services');
const orders = await getUserOrders('user-uid-here');
console.log('Orders found:', orders);
```

---

### Problem 5: "Admin Can't Access Dashboard"

**Symptoms:**
- Login with owner@cablehq.com works
- But redirected to /owner/login instead of /owner
- Can't see dashboard
- "Only admin can access" message

**Solutions:**
1. **Verify admin UID:**
   - Firebase UID must match `IlrRPiSdkJdtwHpnmTk1E0Q2X3f1`
   - Go to Firebase Console → Authentication → Users
   - Find owner@cablehq.com
   - Copy the UID
   - If different, update ADMIN_UID in `src/lib/firebase-services.ts`

2. **Check admin profile exists:**
   - Go to Firestore → user_profiles collection
   - Look for document with ID: `IlrRPiSdkJdtwHpnmTk1E0Q2X3f1`
   - Should have: `role: "admin"` and `isAdmin: true`
   - If missing, create it manually

3. **Check OwnerAuthContext logic:**
   - Open `src/context/OwnerAuthContext.tsx`
   - Verify UID check against ADMIN_UID
   - Make sure `isAdmin` is set correctly
   - Check localStorage for `owner-dashboard-authenticated`

4. **Clear localStorage:**
   ```javascript
   // In browser console:
   localStorage.clear();
   location.reload();
   ```

5. **Check browser storage:**
   - F12 → Application → Local Storage
   - Look for `owner-dashboard-authenticated`
   - Should be `"true"` (string, not boolean)
   - Look for `owner-uid` 
   - Should match ADMIN_UID

**Test:**
```javascript
// Check admin status:
const { useOwnerAuth } = require('./context/OwnerAuthContext');
const { isAdmin, userId } = useOwnerAuth();
console.log('Is Admin:', isAdmin);
console.log('User ID:', userId);
console.log('Expected Admin UID:', 'IlrRPiSdkJdtwHpnmTk1E0Q2X3f1');
```

---

### Problem 6: "Firestore Permission Denied Errors"

**Symptoms:**
- Error: "Missing or insufficient permissions"
- Can't read/write orders or inquiries
- Admin can't access data
- Rules seem correct but still blocked

**Solutions:**
1. **Check Security Rules are published:**
   - Go to Firebase Console → Firestore → Rules
   - Scroll to bottom - should see "Last published: ..."
   - If it says "Never published", click Publish

2. **Check Rules syntax:**
   - Rules must be valid JavaScript-like syntax
   - Look for red X marks in Rules editor
   - Check for missing semicolons or braces

3. **Test Rules in Simulator:**
   - In Rules editor, click "Rules playground"
   - Simulate read/write operations
   - See which rules allow/deny access

4. **Verify UID in rules:**
   - Make sure ADMIN_UID in rules matches code
   - Both should be: `IlrRPiSdkJdtwHpnmTk1E0Q2X3f1`
   - Check exact spelling and format

5. **Check userId field:**
   - Orders/inquiries MUST have userId field
   - Field value must match request.auth.uid
   - If missing, create via Firestore console

**Debug Rules:**
```javascript
// Simulate in Rules Playground:
// Simulate as user: abc123...
// Try to read: orders/{orderId} where userId=abc123...
// Should ALLOW if rules correct
```

---

### Problem 7: "Password Reset Email Not Arriving"

**Symptoms:**
- Click "Forgot Password"
- Email never arrives
- Or email arrives minutes later
- Link in email doesn't work

**Solutions:**
1. **Check email address:**
   - Verify email is spelled correctly
   - Check if account exists in Firebase Auth
   - If not, create account first

2. **Check spam folder:**
   - Email might be marked as spam
   - Check spam/junk folder
   - Add sender to contacts

3. **Check email configuration:**
   - Go to Firebase Console → Authentication → Templates
   - Click "Password reset" template
   - Verify sender email is correct
   - Check "From name" and "Subject"

4. **Wait for email:**
   - Firebase can take up to 5 minutes to send
   - Try requesting password reset again
   - Don't request multiple times (may trigger rate limit)

5. **Check Firebase email provider:**
   - Go to Project Settings → Service Accounts
   - Verify email service is configured
   - Check if quotas are exceeded

**Test:**
```javascript
// In browser console:
const { sendPasswordResetEmail } = require('./lib/firebase-services');
await sendPasswordResetEmail('test@example.com');
// Check console for errors
```

---

### Problem 8: "Logout Doesn't Clear Data"

**Symptoms:**
- Click logout
- Then click login as different user
- Still see previous user's data
- Orders/inquiries not cleared

**Solutions:**
1. **Check logout function:**
   - Open `src/context/UserAuthContext.tsx`
   - Find `logout` function
   - Should clear: user, orders, inquiries, localStorage
   - Make sure all state is reset

2. **Clear browser storage manually:**
   ```javascript
   // In browser console:
   localStorage.removeItem('wirebazaar-user');
   localStorage.removeItem('wirebazaar-otp');
   localStorage.removeItem('firebase_id_token');
   localStorage.clear(); // Clear everything
   location.reload(); // Refresh page
   ```

3. **Check Firebase Auth logout:**
   - Verify `signOut(auth)` is called
   - Check if it completes successfully
   - Monitor Network tab for auth requests

4. **Check if auth state persists:**
   - Even after logout, Firebase Auth might restore session
   - `onAuthStateChanged` listener should detect this
   - Should set user to null

---

## 🔧 Debugging Tools

### Browser Console
```javascript
// Check current auth user:
const auth = require('./lib/firebase').auth;
console.log('Current user:', auth.currentUser);

// Check Firestore connection:
const db = require('./lib/firebase').db;
console.log('Firestore:', db);

// Check UserAuth context:
const { useUserAuth } = require('./context/UserAuthContext');
console.log('User context:', useUserAuth());

// Check OwnerAuth context:
const { useOwnerAuth } = require('./context/OwnerAuthContext');
console.log('Owner context:', useOwnerAuth());
```

### Firebase Console Tools
1. **Authentication → Users** - See all created accounts
2. **Firestore → Data** - View all collections and documents
3. **Firestore → Rules** - Test rules with playground
4. **Firestore → Indexes** - Check if indexes are needed

### Network Tab (F12)
1. Look for requests to `firebaseapp.com`
2. Check status (should be 200, not 403)
3. Check response for error messages
4. Look for CORS issues

---

## 🆘 When All Else Fails

### Step-by-Step Recovery

1. **Clear everything:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   // Then refresh: Ctrl+Shift+R or Cmd+Shift+R
   ```

2. **Check Firebase Console:**
   - Go to every collection and verify data
   - Manually recreate missing documents if needed
   - Check for corrupted data

3. **Check code for errors:**
   - Open DevTools → Console
   - Look for red errors
   - Check each error's line number
   - Fix syntax errors first

4. **Re-authenticate:**
   - Logout completely
   - Clear all storage
   - Login again from scratch
   - See if data loads correctly

5. **Test with admin account:**
   - If regular user fails, try admin
   - If admin works, problem is in user-specific code
   - If admin fails, problem is in core Firebase setup

### Get Help

If you're still stuck:
1. Check the **AUTHENTICATION_SETUP_GUIDE.md** for expected behavior
2. Review **IMPLEMENTATION_CHECKLIST.md** to verify all changes
3. Check **FIREBASE_CONFIGURATION.md** for setup steps
4. Look at **AUTH_IMPLEMENTATION_SUMMARY.md** for technical details

---

## 📊 Common Error Codes

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `auth/user-not-found` | Email not in Firebase Auth | Create account or check spelling |
| `auth/wrong-password` | Password incorrect | Verify password or reset |
| `auth/email-already-in-use` | Email already has account | Use different email or login |
| `auth/weak-password` | Password < 6 chars | Use stronger password |
| `auth/invalid-email` | Email format wrong | Check email format |
| `permission-denied` | Firestore rules deny access | Check/update security rules |
| `not-found` | Document doesn't exist | Create document or check ID |
| `PERMISSION_DENIED` | Admin SDK permission issue | Check service account permissions |

---

## ✅ Verification Commands

Run these in browser console to verify setup:

```javascript
// 1. Check Firebase Auth
const auth = require('./lib/firebase').auth;
console.assert(auth, 'Firebase Auth not initialized');

// 2. Check Firestore
const db = require('./lib/firebase').db;
console.assert(db, 'Firestore not initialized');

// 3. Check ADMIN_UID
const { ADMIN_UID } = require('./lib/firebase-services');
console.assert(ADMIN_UID === 'IlrRPiSdkJdtwHpnmTk1E0Q2X3f1', 'ADMIN_UID mismatch');

// 4. Check current user
const currentUser = auth.currentUser;
console.log('Current user:', currentUser?.email, 'UID:', currentUser?.uid);

// 5. Test Firestore access
const { getUserOrders } = require('./lib/firebase-services');
if (currentUser) {
  const orders = await getUserOrders(currentUser.uid);
  console.log('User orders:', orders);
}
```

---

## 🎯 Next Steps

1. **Identify the problem** using this guide
2. **Try the solution** for your specific issue
3. **Test to verify** it's fixed
4. **Document** what worked for future reference
5. **If stuck**, check the detailed guides or contact support

You've got this! 🚀
