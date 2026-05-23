import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet } from '@tanstack/react-router'
import { DashboardPage } from './pages/Dashboard'
import { UploadPage } from './pages/Upload'
import { AnalysisPage } from './pages/Analysis'
import { useAuth } from './hooks/useAuth'
import { Button, LoadingOverlay } from '@blinkdotnew/ui'
import { Film } from 'lucide-react'

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Outlet />
    </div>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/upload',
  component: UploadPage,
})

const analysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analysis/$id',
  component: AnalysisPage,
})

const routeTree = rootRoute.addChildren([indexRoute, uploadRoute, analysisRoute])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  const { user, isLoading, login } = useAuth()

  if (isLoading) {
    return <LoadingOverlay />
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background cinematic-gradient">
        <div className="max-w-md w-full text-center space-y-8 glass p-8 rounded-2xl border-white/10 animate-fade-in">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Film className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Smart Script Analyzer</h1>
            <p className="text-muted-foreground">Cinematic-grade intelligence for screenwriters and producers.</p>
          </div>
          <Button onClick={login} size="lg" className="w-full text-lg h-12 font-semibold">
            Sign In to Start Analysis
          </Button>
          <p className="text-xs text-muted-foreground pt-4">
            Securely analyze, predict, and optimize your screenplay with local vector search.
          </p>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}
