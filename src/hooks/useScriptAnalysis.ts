import { useState } from 'react'
import { blink } from '../blink/client'
import { analyzeScript, ScriptAnalysis } from '../lib/analysis'
import { toast } from '@blinkdotnew/ui'

// Simple uuid fallback
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

export function useScriptAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const processScript = async (file: File, userId: string) => {
    setIsAnalyzing(true)
    console.log('Starting script processing for file:', file.name)
    try {
      // 1. Upload file to storage
      const extension = file.name.split('.').pop()
      const path = `scripts/${userId}/${Date.now()}_${extension}/${file.name}`
      console.log('Uploading to storage path:', path)
      const { publicUrl } = await blink.storage.upload(file, path)
      console.log('Upload successful, publicUrl:', publicUrl)

      // 2. Extract text (supports PDF, DOCX, TXT, etc.)
      let content = ''
      try {
        console.log('Extracting text from URL...')
        content = await blink.data.extractFromUrl(publicUrl)
        console.log('Text extraction complete. Length:', content?.length)
      } catch (err) {
        console.warn('Advanced extraction failed, falling back to raw text', err)
        content = await file.text()
      }

      if (!content || content.trim().length < 50) {
        throw new Error('Extracted script content is too short or empty.')
      }

      // 3. Perform AI Analysis
      console.log('Performing AI analysis...')
      const analysis = await analyzeScript(content)
      console.log('AI Analysis complete:', analysis)
      
      if (!analysis) {
        throw new Error('AI Analysis failed to generate a report.')
      }

      // 4. Save to Database
      const scriptId = generateId()
      console.log('Saving results to DB, scriptId:', scriptId)
      
      // Save script record
      await blink.db.scripts.create({
        id: scriptId,
        name: file.name,
        type: extension || 'txt',
        filePath: publicUrl,
        status: 'completed',
        score: analysis?.intelligentScore ?? 0,
        userId
      })

      // Save analysis details
      await blink.db.analyses.create({
        id: generateId(),
        scriptId,
        genre: analysis?.genre ?? 'Unknown',
        structure: analysis?.structure ?? 'Linear',
        predictedQuality: analysis?.predictedQuality ?? 0,
        intelligentScore: analysis?.intelligentScore ?? 0,
        userId
      })

      // Save weaknesses
      const currentWeaknesses = Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []
      for (const w of currentWeaknesses) {
        await blink.db.weaknesses.create({
          id: generateId(),
          scriptId,
          category: w?.category ?? 'General',
          description: w?.description ?? 'No description provided.',
          severity: w?.severity ?? 50,
          userId
        })
      }

      // Save recommendations
      const currentRecommendations = Array.isArray(analysis?.recommendations) ? analysis.recommendations : []
      for (const r of currentRecommendations) {
        await blink.db.recommendations.create({
          id: generateId(),
          scriptId,
          issue: r?.issue ?? 'Structural Pattern',
          recommendation: r?.recommendation ?? 'No specific recommendation.',
          userId
        })
      }

      // Save emotional curve
      const currentCurve = Array.isArray(analysis?.emotionalCurve) ? analysis.emotionalCurve : []
      for (const e of currentCurve) {
        await blink.db.emotionalCurve.create({
          id: generateId(),
          scriptId,
          timestamp: e?.timestamp ?? 0,
          sentiment: e?.sentiment ?? 0,
          userId
        })
      }

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