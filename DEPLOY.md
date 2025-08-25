# Deploy Instructions

## Vercel Deployment

### Prerequisites
- GitHub repository pushed with all code
- Supabase project configured
- Vercel account

### Steps

1. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import project from GitHub: `https://github.com/treze1310/almoxarifadobalimax.git`
   - Select framework: **Vite**

2. **Environment Variables**
   Configure the following environment variables in Vercel:
   ```
   VITE_SUPABASE_URL=https://emcyvosymdelzxrokdvf.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `./`

4. **Domain Configuration**
   - Custom domain can be added in Vercel dashboard
   - SSL certificate is automatic

### Post-Deployment

1. **Update Supabase URLs**
   - Add production URL to Supabase Auth settings
   - Configure redirect URLs for password reset
   - Update CORS settings if needed

2. **Test Authentication**
   - Login functionality
   - User registration
   - Password reset flow

3. **Database Migrations**
   - Ensure all migrations are applied
   - Verify RLS policies are active
   - Test user permissions

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Troubleshooting

### Common Issues
1. **Build failures**: Check package.json dependencies
2. **Auth issues**: Verify Supabase configuration
3. **CORS errors**: Update Supabase Auth settings

### Performance Optimization
- Images are optimized automatically by Vercel
- Static assets are cached by CDN
- API routes can be added as Vercel functions if needed