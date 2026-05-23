import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { blink } from '../blink/client'
import { useAuth } from '../hooks/useAuth'
import { Page, PageHeader, PageTitle, PageBody, PageActions, Button, DataTable, StatGroup, Stat, EmptyState, Persona } from '@blinkdotnew/ui'
import { Plus, Film, TrendingUp, AlertTriangle, ChevronRight, Activity } from 'lucide-react'
import { format } from 'date-fns'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const [scripts, setScripts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        const { data } = await blink.db.scripts.list({
          where: { user_id: user?.id },
          orderBy: { created_at: 'desc' }
        })
        setScripts(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to fetch scripts:', error)
        setScripts([])
      } finally {
        setIsLoading(false)
      }
    }
    if (user) fetchScripts()
  }, [user])

  const columns = [
    {
      accessorKey: 'name',
      header: 'Screenplay',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Film className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">{row.original?.name ?? 'Untitled'}</span>
        </div>
      )
    },
    {
      accessorKey: 'score',
      header: 'Intelligent Score',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${(row.original?.score ?? 0) >= 80 ? 'bg-green-500' : (row.original?.score ?? 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} />
          <span className="font-mono">{row.original?.score ?? 0}/100</span>
        </div>
      )
    },
    {
      accessorKey: 'createdAt',
      header: 'Analyzed Date',
      cell: ({ row }: any) => {
        const dateStr = row.original?.createdAt || row.original?.created_at
        const date = dateStr ? new Date(dateStr) : null
        return date && !isNaN(date.getTime()) ? format(date, 'MMM d, yyyy') : 'N/A'
      }
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <Button variant="ghost" size="sm" asChild>
          <Link to="/analysis/$id" params={{ id: row.original.id }}>
            View Report <ChevronRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      )
    }
  ]

  return (
    <Page>
      <PageHeader className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-10 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/20 rounded-xl">
            <Film className="w-8 h-8 text-primary" />
          </div>
          <div>
            <PageTitle className="text-3xl font-bold tracking-tight">Intelligence Dashboard</PageTitle>
            <p className="text-muted-foreground">Manage and analyze your cinematic projects.</p>
          </div>
        </div>
        <PageActions className="gap-3">
          <Button variant="outline" onClick={logout}>Sign Out</Button>
          <Button asChild className="shadow-lg shadow-primary/20">
            <Link to="/upload">
              <Plus className="mr-2 w-4 h-4" /> New Analysis
            </Link>
          </Button>
        </PageActions>
      </PageHeader>
      
      <PageBody className="px-8 py-10 space-y-10">
        <StatGroup className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Stat 
            label="Scripts Analyzed" 
            value={Array.isArray(scripts) ? scripts.length.toString() : "0"} 
            icon={<Film className="text-primary" />}
            className="glass"
          />
          <Stat 
            label="Avg. Quality" 
            value={`${Math.round(Array.isArray(scripts) && scripts.length > 0 ? scripts.reduce((acc, s) => acc + (s?.score ?? 0), 0) / scripts.length : 0)}%`}
            icon={<TrendingUp className="text-green-500" />}
            className="glass"
          />
          <Stat 
            label="Critical Issues" 
            value="12" 
            icon={<AlertTriangle className="text-red-500" />}
            className="glass"
          />
          <Stat 
            label="System Status" 
            value="Operational" 
            icon={<Activity className="text-blue-500" />}
            className="glass"
          />
        </StatGroup>

        <div className="glass rounded-2xl border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5">
            <h3 className="text-lg font-semibold">Recent Analyses</h3>
          </div>
          {isLoading ? (
            <div className="p-20 text-center text-muted-foreground animate-pulse">Loading scripts...</div>
          ) : Array.isArray(scripts) && scripts.length > 0 ? (
            <DataTable columns={columns} data={scripts} />
          ) : (
            <div className="py-20">
              <EmptyState 
                icon={<Film className="w-12 h-12" />}
                title="No Screenplays Found"
                description="Upload your first script to unlock cinematic-grade intelligence."
                action={{ label: 'Upload Script', onClick: () => {} }}
              />
            </div>
          )}
        </div>
      </PageBody>
    </Page>
  )
}
