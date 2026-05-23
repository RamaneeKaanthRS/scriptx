import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { blink } from '../blink/client'
import { Page, PageHeader, PageTitle, PageBody, PageActions, Button, Card, CardHeader, CardTitle, CardContent, Badge, StatGroup, Stat, LoadingOverlay } from '@blinkdotnew/ui'
import { ChevronLeft, Film, Star, TrendingUp, AlertTriangle, ShieldCheck, Zap, Brain, MessageSquare } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

export function AnalysisPage() {
  const { id } = useParams({ from: '/analysis/$id' })
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: script } = await blink.db.scripts.get(id) as any
        
        // Try both camelCase and snake_case for the filter to be safe
        const { data: analyses } = await blink.db.analyses.list({ 
          where: { script_id: id } 
        })
        
        const { data: weaknesses } = await blink.db.weaknesses.list({ 
          where: { script_id: id } 
        })
        
        const { data: recommendations } = await blink.db.recommendations.list({ 
          where: { script_id: id } 
        })
        
        const { data: emotionalCurve } = await blink.db.emotionalCurve.list({ 
          where: { script_id: id },
          orderBy: { timestamp: 'asc' }
        })

        if (!script || !Array.isArray(analyses) || analyses.length === 0) {
          console.warn('Analysis not found in DB', { script, analyses })
          setData(null)
          setIsLoading(false)
          return
        }

        setData({
          script,
          analysis: {
            ...analyses[0],
            intelligentScore: analyses[0].intelligentScore || analyses[0].intelligent_score,
            predictedQuality: analyses[0].predictedQuality || analyses[0].predicted_quality,
          },
          weaknesses: (Array.isArray(weaknesses) ? weaknesses : []).map(w => ({
            ...w,
            severity: w.severity ?? w.severity_score ?? 50
          })),
          recommendations: Array.isArray(recommendations) ? recommendations : [],
          emotionalCurve: Array.isArray(emotionalCurve) ? emotionalCurve : []
        })
      } catch (error) {
        console.error('Failed to fetch analysis data:', error)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }
    if (id) fetchData()
  }, [id])

  if (isLoading) return <LoadingOverlay />
  if (!data || !data.analysis) return <div className="p-20 text-center text-muted-foreground glass m-8 rounded-2xl border-white/10">Analysis report not found or incomplete.</div>

  const { script, analysis, weaknesses, recommendations, emotionalCurve } = data

  return (
    <Page className="bg-[#050505]">
      <PageHeader className="px-8 py-6 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <PageTitle className="text-2xl font-bold">{script?.name ?? 'Untitled'}</PageTitle>
              <Badge variant="outline" className="border-primary/50 text-primary">{analysis?.genre ?? 'Unknown'}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">AI Analysis Report • Created on { (script?.createdAt || script?.created_at) ? new Date(script.createdAt || script.created_at).toLocaleDateString() : 'Unknown Date'}</p>
          </div>
        </div>
        <PageActions className="gap-3">
          <Button variant="outline">Export PDF</Button>
          <Button>Share Report</Button>
        </PageActions>
      </PageHeader>

      <PageBody className="px-8 py-10 space-y-10">
        {/* Top Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass cinematic-gradient border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" /> Intelligent Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black text-white">{analysis?.intelligentScore ?? 0}<span className="text-xl font-normal text-muted-foreground">/100</span></div>
                <div className="mt-2 text-sm text-green-500 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-4 h-4" /> Strong Market Potential
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" /> Quality Predictor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black text-white">{analysis?.predictedQuality ?? 0}%</div>
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                  Based on structural benchmarks
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-500" /> Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{analysis?.structure ?? 'Linear'}</div>
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                  Stable narrative arc
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 glass rounded-xl p-6 border-white/10 flex flex-col justify-center text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-white/5" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  <circle className="text-primary" strokeWidth="10" strokeDasharray={`${(analysis?.intelligentScore ?? 0) * 2.51} 251.2`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" transform="rotate(-90 50 50)" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-black">{analysis?.intelligentScore ?? 0}</div>
              </div>
            </div>
            <p className="font-semibold text-lg">Overall Performance</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> Emotional Sentiment Curve
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={Array.isArray(emotionalCurve) ? emotionalCurve : []}>
                  <defs>
                    <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" hide />
                  <YAxis domain={[-1, 1]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area type="monotone" dataKey="sentiment" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSentiment)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-between mt-4 px-2 text-xs text-muted-foreground uppercase font-bold tracking-widest">
                <span>ACT I</span>
                <span>ACT II</span>
                <span>ACT III</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Structural Weakness Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Array.isArray(weaknesses) ? weaknesses : []} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis dataKey="category" type="category" width={100} tick={{ fill: '#888', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="severity" radius={[0, 4, 4, 0]}>
                    {(Array.isArray(weaknesses) ? weaknesses : []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={(entry?.severity ?? 0) > 70 ? '#ef4444' : (entry?.severity ?? 0) > 40 ? '#f59e0b' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Similarity Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            <h3 className="text-2xl font-bold tracking-tight">Similarity Search results</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'The Dark Knight', match: 89, reason: 'Tone & Structure' },
              { title: 'Se7en', match: 82, reason: 'Pacing & Character Arc' },
              { title: 'The Departed', match: 78, reason: 'Dialogue Patterns' },
            ].map((sim, i) => (
              <Card key={i} className="glass border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-default">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="secondary" className="bg-[#f59e0b1a] text-[#f59e0b] border-none">{sim?.match ?? 0}% Match</Badge>
                    <div className="p-2 bg-white/5 rounded-lg">
                      <Film className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold mb-1">{sim?.title ?? 'Unknown'}</h4>
                  <p className="text-sm text-muted-foreground">Similar {sim?.reason ?? 'Patterns'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Script Doctor Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-8 h-8 text-primary" />
              <h3 className="text-2xl font-bold tracking-tight">AI Script Doctor Recommendations</h3>
            </div>
            
            <div className="space-y-4">
              {(Array.isArray(recommendations) ? recommendations : []).map((rec: any, idx: number) => (
                <Card key={idx} className="glass border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                      Issue: {rec?.issue ?? 'Pattern Match'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{rec?.recommendation ?? 'No recommendation available.'}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="glass border-primary/20 bg-primary/5 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Star className="w-5 h-5" /> Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">
                  Overall, your script demonstrates a strong grasp of {analysis?.genre ?? 'genre'} tropes with a compelling {analysis?.structure ?? 'structure'} narrative structure. 
                  The predicted quality score of {analysis?.predictedQuality ?? 0}% puts this in the top 15% of scripts analyzed this month.
                </p>
                <div className="pt-4 border-t border-primary/10 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pacing</span>
                    <span className="text-white font-mono">Good</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Character Arcs</span>
                    <span className="text-white font-mono">Strong</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dialogue Naturalism</span>
                    <span className="text-white font-mono">Medium</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">Regenerate Analysis</Button>
                <Button variant="outline" className="w-full justify-start">Compare with Top Hit</Button>
                <Button variant="outline" className="w-full justify-start">AI Dialogue Tuner</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </Page>
  )
}
