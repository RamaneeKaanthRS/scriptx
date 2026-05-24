import { useState } from 'react'
import { uploadScript } from '../lib/api'
import { toast } from '@blinkdotnew/ui'

export function useScriptAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const processScript = async (file: File) => {
    setIsAnalyzing(true)
    console.log('Starting script processing for file:', file.name)
    try {
      const scriptId = await uploadScript(file)
      toast.success('Script analysis complete!')
      return scriptId
    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error('Analysis failed. Please try again.')
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }

  return { processScript, isAnalyzing }
}
