# Firebase Configuration & Admin User Setup

## 🔧 Step-by-Step Firebase Setup

### Step 1: Verify Firebase Project Configuration

Your app is already configured to use Firebase project: **wirebazar-c1322**

#### Current Configuration in Code:
- **File:** `src/lib/firebase.ts`
- **Project ID:** wirebazar-c1322
- **Auth:** Email/Password enabled
- **Firestore:** Configured and ready

---

### Step 2: Create Admin User in Firebase Auth

**You MUST do this manually in Firebase Console:**

#### Instructions:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **wirebazar-c1322**
3. Click **Authentication** (left sidebar)
4. Click **Users** tab
5. Click **Add User** button
6. Fill in:
   - **Email:** `owner@cablehq.com`
   - **Password:** `SecurePass123!` (change this in production)
7. Click **Add User**

#### ⚠️ Important Note:
Firebase will auto-generate a UID for this user. **DO NOT change the UID to `zh5ODSgQOCgkkz74zNulyeS36XL2`** yet. We'll map it in the next step.

---

### Step 3: Create Admin Profile in Firestore

After creating the user in Firebase Auth, you need to create the admin profile document.

#### Option A: Use Firebase Console (Easy)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **wirebazar-c1322**
3. Click **Firestore Database** (left sidebar)
4. Click **Start Collection** button
5. Collection ID: `user_profiles`
6. Document ID: `IlrRPiSdkJdtwHpnmTk1E0Q2X3f1` (the ADMIN_UID from code)
7. Click **Auto ID** and then edit to use the UID above
8. Add fields:
   - `uid` (string): `zh5ODSgQOCgkkz74zNulyeS36XL2`
   - `email` (string): `owner@cablehq.com`
   - `role` (string): `admin`
   - `isAdmin` (boolean): `true`
   - `createdAt` (timestamp): Current date/time
   - `updatedAt` (timestamp): Current date/time
9. Click **Save**

#### Option B: Use Firebase CLI
```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Set project
firebase use wirebazar-c1322

# Create the admin profile document
firebase firestore:set user_profiles/IlrRPiSdkJdtwHpnmTk1E0Q2X3f1 \
  '{
    "uid": "IlrRPiSdkJdtwHpnmTk1E0Q2X3f1",
    "email": "owner@cablehq.com",
    "role": "admin",
    "isAdmin": true,
    "createdAt": null,
    "updatedAt": null
  }' --merge
```

#### Option C: Use Admin SDK Script
Create a file `setup-admin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const ADMIN_UID = 'IlrRPiSdkJdtwHpnmTk1E0Q2X3f1';

async function createAdminProfile() {
  try {
    await db.collection('user_profiles').doc(ADMIN_UID).set({
      uid: ADMIN_UID,
      email: 'owner@cablehq.com',
      role: 'admin',
      isAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`Admin profile created for UID: ${ADMIN_UID}`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin profile:', error);
    process.exit(1);
  }
}

createAdminProfile();
```

---

### Step 4: Handle UID Mismatch (IMPORTANT)

The challenge: Firebase will generate a random UID for the admin user, but the code expects `zh5ODSgQOCgkkz74zNulyeS36XL2`.

#### Solution A: Update Code to Match Firebase UID (Recommended)
1. After creating the admin user in Firebase, note the UID Firebase generated
2. Update the code to use that UID:
   - **File:** `src/lib/firebase-services.ts`
   - Change: `export const ADMIN_UID = '{firebase_generated_uid}'`
3. Create the user_profiles document with the same UID

#### Solution B: Use Firebase Custom Claims (Advanced)
1. Install Firebase Admin SDK
2. Use custom claims to mark the user as admin:

```javascript
admin.auth().setCustomUserClaims(firebaseUid, { admin: true });
```

3. Update the code to check custom claims instead of hardcoded UID

---

### Step 5: Apply Firestore Security Rules

**This is CRITICAL for production security.**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **wirebazar-c1322**
3. Click **Firestore Database** → **Rules** tab
4. Replace all content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return request.auth != null &&
        (request.auth.uid == "IlrRPiSdkJdtwHpnmTk1E0Q2X3f1" ||
         exists(/databases/$(database)/documents/owners/$(request.auth.uid)));
    }
    
    match /user_profiles/{userId} {
      allow read, write: if isSignedIn() && (request.auth.uid == userId || isAdmin());
    }
    
    match /products/{productId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    match /orders/{orderId} {
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if isAdmin() || resource.data.userId == request.auth.uid;
    }
    
    match /inquiries/{inquiryId} {
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if isAdmin() || resource.data.userId == request.auth.uid;
    }
    
    match /owners/{ownerId} {
      allow read, write: if isAdmin();
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5. Click **Publish** button
6. Confirm: "This will update rules for all databases in this project" → Click **Publish**

---

### Step 6: Enable Required Authentication Methods

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **wirebazar-c1322**
3. Click **Authentication** (left sidebar)
4. Click **Sign-in method** tab
5. Ensure these are **Enabled**:
   - ✅ Email/Password
   - ✅ Google (optional, but recommended)

6. Disable:
   - ❌ Anonymous (if enabled)

---

### Step 7: Configure Email Settings (Password Reset)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **wirebazar-c1322**
3. Click **Authentication** (left sidebar)
4. Click **Templates** tab
5. Find "Password reset" template
6. Customize if needed (optional)
   - Default works fine
   - Make sure sender email is correct

---

### Step 8: Set Up Email Provider (Optional but Recommended)

For password reset and OTP emails to work:

1. Go to **Project Settings** (gear icon)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. This downloads a JSON file - keep it secure
5. Set up email provider:
   - Firebase uses SendGrid by default
   - Or configure your own SMTP

---

## ✅ Verification Checklist

After setup, verify everything:

### Firebase Console Checklist
- [ ] Project created: wirebazar-c1322
- [ ] Authentication enabled: Email/Password
- [ ] Firestore Database created
- [ ] Admin user created: owner@cablehq.com
- [ ] Admin profile in Firestore: user_profiles/zh5ODSgQOCgkkz74zNulyeS36XL2
- [ ] Security Rules published
- [ ] Email templates configured

### Code Verification
- [ ] ADMIN_UID correct in `src/lib/firebase-services.ts`
- [ ] Firebase config correct in `src/lib/firebase.ts`
- [ ] No hardcoded credentials in code
- [ ] Environment variables set (if needed)

### Test Verification
- [ ] Can create regular user account
- [ ] Can verify OTP with code 123456
- [ ] Can login and see orders
- [ ] Can login as admin with owner@cablehq.com
- [ ] Admin sees all orders/inquiries
- [ ] Regular user sees only their data

---

## 🚨 Common Issues & Solutions

### Issue: "Permission denied" when creating user
**Solution:** Make sure Firestore Security Rules are properly published and correct UID is used

### Issue: Admin can login but can't see dashboard
**Solution:** Verify the ADMIN_UID in code matches the user's Firebase UID or Firestore profile

### Issue: Password reset email not working
**Solution:** 
1. Check email templates are configured
2. Verify sender email in Firebase
3. Check spam folder
4. Wait up to 5 minutes for first email

### Issue: OTP always fails (even with 123456)
**Solution:** 
1. Check that 123456 is hardcoded in UserAuthContext
2. Verify TEST_OTP constant is used
3. Check browser console for hashing errors

### Issue: "Collection not found" error
**Solution:** 
1. Create collection manually in Firebase Console
2. Or create first document in code
3. Firestore doesn't create empty collections

---

## 📋 Production Checklist

Before deploying to production:

- [ ] Change admin password from `SecurePass123!`
- [ ] Replace hardcoded OTP 123456 with SMS service
- [ ] Set up error logging (Sentry, etc.)
- [ ] Configure CORS if needed
- [ ] Set up database backups
- [ ] Test all user flows end-to-end
- [ ] Load test with expected user volume
- [ ] Set up monitoring and alerts
- [ ] Document runbook for common issues
- [ ] Prepare incident response plan

---

## 🔐 Security Best Practices

### For Development
✓ Use test credentials
✓ Keep Firebase console access limited
✓ Use separate projects for dev/prod
✓ Don't commit credentials to git

### For Production
✓ Change all test passwords
✓ Enable 2FA for admin accounts
✓ Regular security audits
✓ Monitor failed login attempts
✓ Set up database backups
✓ Use Cloud KMS for secrets
✓ Enable audit logging
✓ Implement rate limiting
✓ Monitor for suspicious activity

---

## 📞 Getting Help

If you encounter issues:

1. **Firebase Console Issues:** Check Firebase documentation
2. **Authentication Issues:** Check browser console (F12)
3. **Firestore Issues:** Check Firestore Rules tab for errors
4. **Email Issues:** Check email provider status
5. **Code Issues:** Review the implementation guides

---

## 🎯 Next Steps

1. ✅ Create admin user in Firebase Auth
2. ✅ Create admin profile in Firestore
3. ✅ Apply Firestore Security Rules
4. ✅ Verify admin can login
5. ✅ Test regular user signup/login
6. ✅ Test order creation and retrieval
7. ✅ Deploy when ready

**You're all set! Your Firebase backend is configured and ready to go.** 🚀
