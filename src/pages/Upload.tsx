import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { useScriptAnalysis } from '../hooks/useScriptAnalysis'
import { Page, PageHeader, PageTitle, PageBody, Button, FileUpload, LoadingOverlay } from '@blinkdotnew/ui'
import { ChevronLeft, Upload as UploadIcon, FileText, CheckCircle, AlertCircle } from 'lucide-react'

export function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { processScript, isAnalyzing } = useScriptAnalysis()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleUpload = async () => {
    if (!selectedFile || !user) return
    
    try {
      const scriptId = await processScript(selectedFile, user.id)
      navigate({ to: '/analysis/$id', params: { id: scriptId } })
    } catch (error: any) {
      console.error('Upload page error:', error)
      toast.error(error?.message || 'Analysis failed. Please try a different file.')
    }
  }

  return (
    <Page>
      {isAnalyzing && (
        <LoadingOverlay />
      )}

      <PageHeader className="px-8 py-6 border-b border-white/5">
        <Button variant="ghost" onClick={() => navigate({ to: '/' })} className="mr-4">
          <ChevronLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <PageTitle>New Analysis</PageTitle>
      </PageHeader>

      <PageBody className="flex flex-col items-center justify-center p-8 max-w-4xl mx-auto space-y-12 py-20">
        <div className="text-center space-y-4 max-w-xl">
          <h2 className="text-4xl font-bold tracking-tight">Upload Your Masterpiece</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Support for PDF, DOCX, TXT, FDX, and Fountain.
            Our AI will perform deep structure analysis, character profiling, and market potential prediction.
          </p>
        </div>

        <div className="w-full max-w-2xl space-y-8">
          <div className="glass rounded-3xl border-white/10 p-12 text-center transition-all hover:border-primary/50 group">
            {!selectedFile ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-6 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                    <UploadIcon className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold">Drop your screenplay file here</p>
                  <p className="text-muted-foreground">Or click to browse from your computer</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  id="file-upload" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Button 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  size="lg"
                  className="px-8"
                >
                  Select File
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-6 bg-green-500/10 rounded-full">
                    <FileText className="w-12 h-12 text-green-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold">{selectedFile.name}</p>
                  <p className="text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for analysis</p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => setSelectedFile(null)}>Change File</Button>
                  <Button onClick={handleUpload} size="lg" className="px-8 font-semibold">
                    Start AI Analysis
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground block mb-1">Confidential & Private</span>
                Your intellectual property is protected. We use local vector search and retrieval-only patterns.
              </p>
            </div>
            <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <AlertCircle className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground block mb-1">Quality Guaranteed</span>
                Our models are trained on thousands of successful screenplays to provide accurate predictions.
              </p>
            </div>
          </div>
        </div>
      </PageBody>
    </Page>
  )
}
