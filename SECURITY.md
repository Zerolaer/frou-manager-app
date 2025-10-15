# Security Guidelines - Frou Manager App

## 🔒 Security Best Practices

### Environment Variables

**CRITICAL:** Never commit sensitive credentials to version control!

1. **Setup `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual Supabase credentials
   ```

2. **Required variables:**
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

3. **Production deployment:**
   - Set environment variables in your hosting platform (Netlify, Vercel, etc.)
   - Never expose Supabase service role key in frontend code
   - Use Supabase Row Level Security (RLS) policies

---

## 🛡️ Security Checklist

### Authentication
- [x] Protected routes with auth guards
- [x] Session persistence
- [x] Auto logout on token expiration
- [ ] Brute force protection (handled by Supabase)
- [ ] Two-factor authentication (optional)

### Data Validation
- [x] Client-side validation (dataValidation.ts)
- [x] XSS protection via sanitizeHtml
- [x] Input length limits
- [x] Type validation with TypeScript
- [ ] Server-side validation (RLS policies in Supabase)

### API Security
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] User can only access their own data
- [ ] Rate limiting on Supabase (check project settings)
- [ ] CORS properly configured

### Client-side Security
- [x] No sensitive data in localStorage/sessionStorage
- [x] XSS protection in all user inputs
- [x] Content Security Policy headers (netlify.toml)
- [ ] Subresource Integrity for CDN resources

---

## 🚨 Known Issues (Fixed)

### ✅ Fixed Issues:
1. **Hardcoded Supabase credentials** - FIXED
   - Moved to environment variables
   - Added validation on startup
   - Created .env.example template

---

## 🔍 Security Audit Results

### npm audit

**Last Run:** October 15, 2025  
**Status:** 2 moderate vulnerabilities (dev dependencies only)

**Details:**
- esbuild <=0.24.2 - Development server vulnerability
- vite 0.11.0 - 6.1.6 - Depends on vulnerable esbuild

**Impact:** Low (development only, not in production build)

**Run audit regularly:**
```bash
npm audit
npm audit fix  # For non-breaking fixes
```

**Note:** Breaking changes available via `npm audit fix --force` (updates to Vite 7.x)

### OWASP Top 10 Coverage

1. **Injection** - ✅ Protected
   - Supabase uses parameterized queries
   - Client-side sanitization

2. **Broken Authentication** - ✅ Protected
   - Handled by Supabase Auth
   - Secure session management

3. **Sensitive Data Exposure** - ⚠️ Partial
   - Environment variables used
   - TODO: Implement HTTPS enforcement

4. **XML External Entities (XXE)** - N/A
   - Not using XML parsing

5. **Broken Access Control** - ⚠️ TODO
   - Need RLS policies verification

6. **Security Misconfiguration** - ✅ Protected
   - Security headers in netlify.toml
   - CSP, X-Frame-Options, etc.

7. **Cross-Site Scripting (XSS)** - ✅ Protected
   - sanitizeHtml utility
   - React auto-escaping

8. **Insecure Deserialization** - ✅ Protected
   - JSON only
   - No eval() usage

9. **Using Components with Known Vulnerabilities** - ⚠️ TODO
   - Run `npm audit` regularly
   - Keep dependencies updated

10. **Insufficient Logging & Monitoring** - ✅ Implemented
    - Client-side logging (monitoring.ts)
    - Error reporting ready
    - TODO: Connect to Sentry

---

## 📋 Security Testing Checklist

### Manual Testing
- [ ] Test XSS in all input fields
- [ ] Test SQL injection via Supabase
- [ ] Test authentication bypass attempts
- [ ] Test CSRF attacks
- [ ] Test session hijacking
- [ ] Test access to other users' data

### Automated Testing
- [ ] Setup OWASP ZAP scanning
- [ ] Setup Snyk for dependency scanning
- [ ] Setup Lighthouse security audit
- [ ] Setup npm audit in CI/CD

---

## 🔐 Supabase Row Level Security (RLS)

### Required RLS Policies

**Tables to secure:**

1. **tasks**
   ```sql
   CREATE POLICY "Users can only access their own tasks"
   ON tasks FOR ALL
   USING (auth.uid() = user_id);
   ```

2. **finance**
   ```sql
   CREATE POLICY "Users can only access their own finance records"
   ON finance FOR ALL
   USING (auth.uid() = user_id);
   ```

3. **notes**
   ```sql
   CREATE POLICY "Users can only access their own notes"
   ON notes FOR ALL
   USING (auth.uid() = user_id);
   ```

4. **projects**
   ```sql
   CREATE POLICY "Users can only access their own projects"
   ON projects FOR ALL
   USING (auth.uid() = user_id);
   ```

### Verify RLS is enabled:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

---

## 🚀 Production Security

### Before Deployment:

1. **Environment Variables:**
   - Set all env vars in hosting platform
   - Never commit .env to git
   - Rotate keys if accidentally exposed

2. **Headers:**
   - Review netlify.toml security headers
   - Enable HSTS
   - Set proper CSP

3. **Supabase:**
   - Enable RLS on all tables
   - Review and test RLS policies
   - Set up rate limiting
   - Enable email verification

4. **Monitoring:**
   - Set up error tracking (Sentry)
   - Monitor failed login attempts
   - Set up alerts for suspicious activity

---

## 📞 Security Issue Reporting

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email: [your-security-email@example.com]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)

---

**Last Updated:** October 15, 2025  
**Security Audit Status:** In Progress

