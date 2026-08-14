import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccessPath, getHomePath, isAppRole } from '@/lib/rbac/permissions'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          } catch {
            // Ignored on server components
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isDashboardRoute = path.startsWith('/dashboard')
  const protectedSections = new Set([
    '/dossiers', '/clients', '/maritime', '/tracking', '/aerien', '/terrestre',
    '/douane', '/documents', '/debours', '/facturation', '/incidents', '/rapports',
    '/parametres', '/abonnement', '/notifications', '/journal-activite', '/onboarding',
  ])
  const isRoleWorkspace = ['/commercial', '/exploitant', '/comptable', '/travail/commercial', '/travail/exploitant', '/travail/comptable'].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  const isWorkspaceRoute = protectedSections.has(path) || isRoleWorkspace
  const isPortalRoute = path.startsWith('/portail') || path.startsWith('/portal')
  const isLoginRoute = path === '/login'
  const isMfaRoute = path === '/mfa-setup' || path === '/mfa-verify'
  const privateRoute = isDashboardRoute || isWorkspaceRoute || isPortalRoute || isMfaRoute
  const privateRedirect = (url: URL) => {
    const redirect = NextResponse.redirect(url)
    redirect.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    return redirect
  }

  if (privateRoute) response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')

  if (path === '/') {
    if (!user) {
      return response
    }
    return NextResponse.redirect(new URL(getHomePath(user.user_metadata?.role), request.url))
  }

  if (privateRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', path)
      return privateRedirect(loginUrl)
    }

    if (!isMfaRoute) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const role = user.user_metadata?.role
      if (role === 'ADMIN' && assurance?.nextLevel !== 'aal2') {
        const setupUrl = new URL('/mfa-setup', request.url)
        setupUrl.searchParams.set('next', path)
        return privateRedirect(setupUrl)
      }
      if (role === 'ADMIN' && assurance?.currentLevel !== 'aal2') {
        const mfaUrl = new URL('/mfa-verify', request.url)
        mfaUrl.searchParams.set('next', path)
        return privateRedirect(mfaUrl)
      }
      if (assurance?.currentLevel === 'aal1' && assurance.nextLevel === 'aal2') {
        const mfaUrl = new URL('/mfa-verify', request.url)
        mfaUrl.searchParams.set('next', path)
        return privateRedirect(mfaUrl)
      }
    }

    const role = user.user_metadata?.role

    if (isAppRole(role) && !canAccessPath(role, path)) {
      return privateRedirect(new URL(getHomePath(role), request.url))
    }

    if ((isDashboardRoute || isWorkspaceRoute) && role === 'CLIENT') {
      return privateRedirect(new URL('/portail', request.url))
    }

    if (isPortalRoute && (role === 'ADMIN' || role === 'AGENT')) {
      return privateRedirect(new URL('/dashboard', request.url))
    }
  }

  if (isLoginRoute && user) {
    return NextResponse.redirect(new URL(getHomePath(user.user_metadata?.role), request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|login|igs-icon.png|igs-logo-full.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
