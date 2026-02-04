# 🚀 Deploy Edge Functions - הוראות

## הבעיה
קוד ה-Edge Functions (כמו gmail-sync) משתנה ב-GitHub אבל לא עולה אוטומטית ל-Supabase.
צריך לעשות **deployment ידני** של הפונקציות.

---

## ✅ פתרון 1: Deploy אוטומטי דרך GitHub Actions (מומלץ)

כבר הוספנו GitHub Action שיעשה deploy אוטומטי כשיש שינויים ב-`supabase/functions/`.

### הגדרה חד-פעמית:

1. **צור Supabase Access Token:**
   - היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
   - לך ל-Account Settings → Access Tokens
   - לחץ "Generate new token"
   - שמור את ה-token (הוא מוצג רק פעם אחת!)

2. **הוסף Secret ל-GitHub:**
   - היכנס ל-GitHub Repository Settings
   - לך ל-Secrets and variables → Actions
   - לחץ "New repository secret"
   - שם: `SUPABASE_ACCESS_TOKEN`
   - ערך: ה-token שיצרת בשלב 1

3. **זהו! מעכשיו:**
   - כל פעם שיש push ל-main עם שינויים ב-Edge Functions
   - GitHub Action יריץ deploy אוטומטי
   - תראה את הסטטוס ב-Actions tab

---

## ✅ פתרון 2: Deploy ידני דרך CLI (מהיר)

### התקנה חד-פעמית:

```bash
# התקן Supabase CLI
npm install -g supabase

# התחבר לחשבון Supabase
supabase login
```

### Deploy של כל הפונקציות:

```bash
# הרץ סקריפט אחד שעושה deploy לכולן
./deploy-functions.sh
```

### Deploy של פונקציה ספציפית:

```bash
# רק gmail-sync
supabase functions deploy gmail-sync --project-ref osqanpfiprsbcontotlq

# רק gmail-auth
supabase functions deploy gmail-auth --project-ref osqanpfiprsbcontotlq

# רק import-invoices
supabase functions deploy import-invoices --project-ref osqanpfiprsbcontotlq
```

---

## ⚠️ חשוב! וודא שיש משתני סביבה

אחרי ה-deploy, וודא ש**כל המשתנים** מוגדרים ב:

**Supabase Dashboard → Settings → Edge Functions → Secrets**

משתנים נדרשים:
```
✅ LOVABLE_API_KEY          (למרת PDF לתמונות)
✅ GOOGLE_CLIENT_ID         (OAuth Gmail)
✅ GOOGLE_CLIENT_SECRET     (OAuth Gmail)
✅ SUPABASE_URL            (כתובת הפרויקט)
✅ SUPABASE_SERVICE_ROLE_KEY (מפתח אדמין)
```

בלי `LOVABLE_API_KEY` - המרת PDF לתמונות **לא תעבוד**!

---

## 🔍 בדיקה שה-Deploy הצליח

1. **לך ל-Supabase Dashboard → Edge Functions**
2. **בדוק שהפונקציות קיימות ומעודכנות**
3. **לחץ על gmail-sync ובדוק את הלוגים**
4. **נסה לסנכרן Gmail ובדוק שזה עובד**

---

## 📝 בעיות נפוצות

### "Function not found"
- לא נעשה deploy של הפונקציה
- הרץ: `./deploy-functions.sh`

### "LOVABLE_API_KEY not defined"
- המשתנה לא מוגדר ב-Supabase Secrets
- הוסף אותו דרך Dashboard

### "PDF splitting failed"
- בדוק שיש `LOVABLE_API_KEY`
- בדוק את הלוגים של gmail-sync
- וודא שאין שגיאות ב-API call

---

## 🎯 סיכום

**אחרי הגדרה חד-פעמית של GitHub Actions:**
- Push ל-main → Deploy אוטומטי ✅
- אין צורך לעשות כלום ידנית ✅

**אם אין GitHub Actions:**
- הרץ `./deploy-functions.sh` אחרי כל שינוי
