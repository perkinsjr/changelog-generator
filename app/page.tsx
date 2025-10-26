"use client"

import { useState } from "react"
import { ChangelogForm } from "@/components/changelog-form"
import { ChangelogDisplay } from "@/components/changelog-display"

export default function Home() {
  const [changelog, setChangelog] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-5xl font-bold tracking-tight text-balance">AI Changelog Generator</h1>
          <p className="text-lg text-muted-foreground text-balance">
            Generate detailed changelogs from GitHub pull requests using AI
          </p>
        </div>

        <div className="space-y-8">
          <ChangelogForm onGenerate={setChangelog} isGenerating={isGenerating} setIsGenerating={setIsGenerating} />

          {(changelog || isGenerating) && <ChangelogDisplay changelog={changelog} isGenerating={isGenerating} />}
        </div>
      </div>
    </main>
  )
}
